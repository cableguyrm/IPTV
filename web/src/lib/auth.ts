import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";

const COOKIE = "btn_session";
const SESSION_DAYS = 14;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await db.insert(schema.sessions).values({ tokenHash: sha256(token), userId, expiresAt, userAgent: ua });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha256(token)));
  jar.delete(COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

export type SessionUser = Omit<User, "passwordHash">;

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(and(eq(schema.sessions.tokenHash, sha256(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  if (!rows[0]) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...user } = rows[0].user;
  if (user.status === "SUSPENDED" || user.status === "REJECTED") return null;
  return user;
});

export const isStaff = (u: SessionUser | null) => !!u && (u.role === "ADMIN" || u.role === "STAFF");

export async function requireUser(next = "/dashboard") {
  const u = await getCurrentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

/** Any signed-in reseller (pending accounts can view, but not transact). */
export async function requireReseller(next = "/dashboard") {
  const u = await requireUser(next);
  if (isStaff(u)) return u; // staff can view reseller area
  return u;
}

export async function requireActiveReseller() {
  const u = await requireUser();
  if (u.status !== "ACTIVE") throw new Error("Your reseller account is awaiting approval.");
  return u;
}

export async function requireStaff() {
  const u = await getCurrentUser();
  if (!u) redirect("/login?next=/admin");
  if (!isStaff(u)) redirect("/dashboard");
  return u;
}

export async function requireAdmin() {
  const u = await requireStaff();
  if (u.role !== "ADMIN") throw new Error("Administrator role required.");
  return u;
}
