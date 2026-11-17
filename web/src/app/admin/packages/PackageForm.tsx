"use client";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { savePackage } from "@/app/actions/admin";
import type { CreditPackage } from "@/db/schema";

const m = (v: number | null | undefined) => (v === null || v === undefined ? "" : (v / 100).toFixed(2));

export function PackageForm({ pkg }: { pkg?: CreditPackage }) {
  return (
    <ActionForm action={savePackage} resetOnSuccess={!pkg} className="grid items-end gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {(e) => (<>
        {pkg && <input type="hidden" name="id" value={pkg.id} />}
        <Field label="Name" name="name" error={e.name}><input name="name" defaultValue={pkg?.name} className="input" required /></Field>
        <Field label="Credits" name="credits" error={e.credits}><input name="credits" type="number" min={1} defaultValue={pkg?.credits} className="input" required /></Field>
        <Field label="USD price" name="priceUsd" error={e.priceUsd}><input name="priceUsd" defaultValue={m(pkg?.priceUsdCents)} className="input" required /></Field>
        <Field label="AED override" name="priceAed" error={e.priceAed}><input name="priceAed" defaultValue={m(pkg?.priceAedFils)} placeholder="auto" className="input" /></Field>
        <Field label="PHP override" name="pricePhp" error={e.pricePhp}><input name="pricePhp" defaultValue={m(pkg?.pricePhpCentavos)} placeholder="auto" className="input" /></Field>
        <Field label="Order" name="sortOrder"><input name="sortOrder" type="number" defaultValue={pkg?.sortOrder ?? 0} className="input" /></Field>
        <div className="sm:col-span-2"><Field label="Terms" name="terms"><input name="terms" defaultValue={pkg?.terms ?? ""} className="input" /></Field></div>
        <div className="flex flex-wrap gap-4 text-xs text-silver-200 sm:col-span-4 lg:col-span-6">
          {([["isActive", "Active", pkg?.isActive ?? true], ["highlight", "Highlight", pkg?.highlight], ["isCustom", "Custom quote (no checkout)", pkg?.isCustom], ["isSample", "Sample data", pkg?.isSample]] as const).map(([n, l, d]) => (
            <label key={n} className="flex items-center gap-1.5"><input type="checkbox" name={n} defaultChecked={!!d} className="accent-crimson" />{l}</label>
          ))}
        </div>
        <div className="lg:col-span-2"><SubmitButton className="btn-primary w-full">{pkg ? "Save" : "Create"}</SubmitButton></div>
      </>)}
    </ActionForm>
  );
}
