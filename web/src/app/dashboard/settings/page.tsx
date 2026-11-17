import { requireReseller } from "@/lib/auth";
import { PageTitle } from "@/components/AppShell";
import { StatusBadge } from "@/components/ui";
import { ProfileForm, PasswordForm } from "./Forms";
import { formatDate } from "@/lib/utils";

export default async function Settings() {
  const u = await requireReseller();
  return (
    <>
      <PageTitle title="Account settings" sub={<>Account status: <StatusBadge status={u.status} /> · member since {formatDate(u.createdAt)}</>} />
      <div className="grid gap-8 xl:grid-cols-2">
        <section className="glass p-6"><h2 className="mb-4 font-display text-lg font-bold uppercase">Profile & notifications</h2><ProfileForm u={{ name: u.name, email: u.email, businessName: u.businessName, phone: u.phone, whatsapp: u.whatsapp, country: u.country, preferredCurrency: u.preferredCurrency, notifyEmail: u.notifyEmail, notifyWhatsapp: u.notifyWhatsapp }} /></section>
        <section className="glass h-fit p-6"><h2 className="mb-4 font-display text-lg font-bold uppercase">Change password</h2><PasswordForm /></section>
      </div>
    </>
  );
}
