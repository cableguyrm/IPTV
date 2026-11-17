import { Legal } from "@/components/Legal";
export const metadata = { title: "Refund Policy" };
export default function Page() {
  return <Legal title="Refund Policy" updated="17 November 2026" sections={[
    ["Unused credits", <p>Unused credits may be refunded within 7 days of purchase on request. Refunds go back to the original payment method, minus any non-recoverable payment fees.</p>],
    ["Used credits", <p>Credits used to activate a subscription are non-refundable once the subscription is active.</p>],
    ["Failed or rejected activations", <p>If a manual activation request is rejected, no credits are deducted. If an activation fails after credits were deducted, the credits are returned to your balance.</p>],
    ["How to request", <p>Open a support ticket under “Payment inquiries” with your order number.</p>],
  ]} />;
}
