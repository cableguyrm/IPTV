import { Legal } from "@/components/Legal";
export const metadata = { title: "Terms of Service" };
export default function Page() {
  return <Legal title="Terms of Service" updated="17 November 2026" sections={[
    ["Accounts", <p>Reseller accounts are subject to approval. You must provide accurate information and keep your credentials secure. We may suspend accounts that breach these terms.</p>],
    ["Lawful use and licensing", <><p>We only list and distribute services for which the business holds the necessary licensing or authorisation. You agree to resell only in jurisdictions where doing so is lawful and to comply with all applicable laws, including copyright and consumer protection laws.</p><p>You must not use the platform or its tools to access, share or distribute content without authorisation.</p></>],
    ["Credits", <p>Credits are a prepaid wholesale unit used to activate subscriptions. Credits are deducted only when a subscription is activated. Credit balances have no cash value except as described in the Refund Policy.</p>],
    ["Payments", <p>Orders are marked paid only after confirmation from our payment provider or verification of a bank transfer by our team.</p>],
    ["Service availability", <p>Channel line-ups, content libraries and features are determined by each provider and may change. We do not guarantee uninterrupted availability.</p>],
    ["Liability", <p>To the extent permitted by law, our liability is limited to the amount you paid for the credits concerned.</p>],
    ["Changes", <p>We may update these terms; material changes will be announced in your dashboard.</p>],
  ]} />;
}
