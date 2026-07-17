import { db, nowIso } from "../db";
import { hashPassword, verifyPassword } from "../password";

interface AdminUserRow {
  id: string;
  username: string;
  password_hash: string;
}

function findByUsername(username: string): AdminUserRow | undefined {
  return db().prepare("SELECT id, username, password_hash FROM admin_users WHERE username = ?").get(username) as AdminUserRow | undefined;
}

/** Verifies credentials and records the login; returns null on any mismatch (no detail on which field). */
export function verifyAdminCredentials(username: string, password: string): { id: string; username: string } | null {
  const row = findByUsername(username);
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  db().prepare("UPDATE admin_users SET last_login_at = ? WHERE id = ?").run(nowIso(), row.id);
  return { id: row.id, username: row.username };
}

/** Verifies the current password, then sets the new one. Returns false if the current password is wrong. */
export function changeAdminPassword(id: string, currentPassword: string, newPassword: string): boolean {
  const row = db().prepare("SELECT id, username, password_hash FROM admin_users WHERE id = ?").get(id) as AdminUserRow | undefined;
  if (!row || !verifyPassword(currentPassword, row.password_hash)) return false;
  db().prepare("UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?").run(hashPassword(newPassword), nowIso(), id);
  return true;
}
