import { Legal } from "@/components/Legal";
export const metadata = { title: "Privacy Policy" };
export default function Page() {
  return <Legal title="Privacy Policy" updated="17 November 2026" sections={[
    ["What we collect", <><p>Account data (name, email, phone/WhatsApp, country, business name), customer records you choose to store, order and payment status, support tickets and attachments, and basic security logs (sign-in events, IP address for audit purposes).</p><p>Card details are entered on our payment provider&apos;s hosted page and are never stored on our servers.</p></>],
    ["How we use it", <ul><li>To operate your reseller account, process orders and add credits.</li><li>To send service messages such as password resets and renewal reminders you enable.</li><li>To prevent fraud and keep an audit trail of credit changes.</li></ul>],
    ["Tools and sensitive data", <p>The M3U / Xtream tools run entirely in your browser. URLs, usernames and passwords you paste there are not sent to or logged by our servers.</p>],
    ["Analytics", <p>We use privacy-friendly, cookie-less analytics (if enabled) that do not track individuals across sites.</p>],
    ["Cookies", <p>We use a strictly necessary session cookie for sign-in and a preference cookie for your display currency.</p>],
    ["Retention & your rights", <p>We keep account and transaction records as long as needed for legal and accounting obligations. You may request access, correction or deletion of your personal data by contacting us, subject to applicable law (including UAE PDPL and the Philippine Data Privacy Act of 2012).</p>],
    ["Customer data you store", <p>As a reseller you are responsible for having a lawful basis to store your customers&apos; details in the platform. We process that data on your behalf.</p>],
  ]} />;
}
