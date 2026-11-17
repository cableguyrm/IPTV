import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { getDisplayCurrency } from "@/lib/currency";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [s, user, currency] = await Promise.all([getSettings(), getCurrentUser(), getDisplayCurrency()]);
  return (
    <>
      <Navbar brand={s.site.brandName} logoUrl={s.site.logoUrl} currency={currency} user={user ? { name: user.name, role: user.role } : null} />
      <main id="main">{children}</main>
      <Footer s={s} />
      <WhatsAppFloat number={s.contact.whatsapp} />
    </>
  );
}
