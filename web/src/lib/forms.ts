import { z } from "zod";

export type ActionState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> } | undefined;

export function fd(formData: FormData) {
  const o: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") o[k] = v.trim();
  return o;
}

export function zodError(err: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "form");
    fieldErrors[k] ??= i.message;
  }
  return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
}

export const optStr = (max = 500) => z.string().max(max).optional().transform((v) => (v ? v : null));
export const reqStr = (min = 1, max = 200, label = "This field") =>
  z.string().min(min, `${label} is required`).max(max, `${label} is too long`);
export const email = z.email("Enter a valid email address").max(200).transform((v) => v.toLowerCase());
export const password = z.string().min(10, "Use at least 10 characters").max(200)
  .regex(/[A-Za-z]/, "Include a letter").regex(/\d/, "Include a number");
export const phone = z.string().max(30).regex(/^[+\d\s()-]*$/, "Use digits, spaces and + only").optional().transform((v) => (v ? v : null));
export const intStr = (min = 0, max = 1_000_000) => z.coerce.number().int().min(min).max(max);
export const optInt = (min = 0, max = 100_000_000) =>
  z.string().optional().transform((v) => (v === undefined || v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= min && v <= max), "Enter a whole number");
/** "12.50" -> 1250 minor units */
export const money = z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 12.50").transform((v) => Math.round(parseFloat(v) * 100));
export const optMoney = z.string().optional().transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d+(\.\d{1,2})?$/.test(v), "Enter an amount like 12.50")
  .transform((v) => (v === null ? null : Math.round(parseFloat(v) * 100)));
export const checkbox = z.string().optional().transform((v) => v === "on" || v === "true");
export const list = z.string().optional().transform((v) => (v ? v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) : []));
