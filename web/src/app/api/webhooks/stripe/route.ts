import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db, schema } from "@/db";
import { getStripe } from "@/lib/stripe";
import { fulfillOrder } from "@/lib/orders";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Stripe webhook: the ONLY path that marks card orders paid. Signature-verified. */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return new Response("Stripe not configured", { status: 503 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), sig, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId) return Response.json({ ignored: true });

  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!order) return Response.json({ ignored: true });

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (session.payment_status !== "paid") break; // async methods confirm later
      if (session.amount_total !== order.amountMinor || session.currency?.toUpperCase() !== order.currency) {
        await audit(null, "order.amount_mismatch", "order", order.id, { expected: order.amountMinor, got: session.amount_total, currency: session.currency });
        return new Response("Amount mismatch", { status: 400 });
      }
      await fulfillOrder(order.id, { providerPaymentId: String(session.payment_intent ?? session.id), source: `stripe:${event.type}` });
      break;
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      if (order.status === "PENDING_PAYMENT") {
        await db.update(schema.orders).set({ status: event.type === "checkout.session.expired" ? "CANCELLED" : "FAILED" }).where(eq(schema.orders.id, order.id));
        await audit(null, "order.payment_failed", "order", order.id, { event: event.type });
      }
      break;
  }
  return Response.json({ received: true });
}
