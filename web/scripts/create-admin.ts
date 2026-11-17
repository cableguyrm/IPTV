import "dotenv/config";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

/** Usage: ADMIN_EMAIL=you@x.com ADMIN_PASSWORD='...' npm run admin:create  (re-running resets the password) */
async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const pw = process.env.ADMIN_PASSWORD;
  if (!email || !pw || pw.length < 10) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (min 10 chars).");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const hash = await bcrypt.hash(pw, 12);
  await pool.query(
    `INSERT INTO users (email, password_hash, name, role, status) VALUES ($1, $2, 'Administrator', 'ADMIN', 'ACTIVE')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'ADMIN', status = 'ACTIVE'`,
    [email, hash],
  );
  await pool.query(`INSERT INTO audit_logs (action, entity, meta) VALUES ('admin.bootstrap', 'user', $1)`, [JSON.stringify({ email })]);
  console.log(`✔ admin ready: ${email}`);
  await pool.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
