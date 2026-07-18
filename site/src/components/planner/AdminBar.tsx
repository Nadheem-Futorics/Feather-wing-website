"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, jpost } from "@/lib/tp-client";

const LINKS = [
  { href: "/admin/crm", label: "CRM" },
  { href: "/admin/trip-enquiries", label: "Enquiries" },
  { href: "/admin/travel-content", label: "Travel Content" },
  { href: "/admin/meetings", label: "Meetings" },
];

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (newPassword !== confirm) { setErr("New passwords don't match."); return; }
    setBusy(true);
    try {
      await jpost("/api/tp/admin/password", { currentPassword, newPassword }, "PATCH");
      setOk(true);
      setTimeout(onDone, 1200);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="tpCard"
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem", alignItems: "end", marginBottom: "1.2rem" }}
      onSubmit={submit}
    >
      <div className="tpField" style={{ margin: 0 }}>
        <label>Current password</label>
        <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
      </div>
      <div className="tpField" style={{ margin: 0 }}>
        <label>New password</label>
        <input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
      </div>
      <div className="tpField" style={{ margin: 0 }}>
        <label>Confirm new password</label>
        <input type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </div>
      {err && <p className="tpErr" style={{ gridColumn: "1 / -1" }}>{err}</p>}
      {ok && <p style={{ gridColumn: "1 / -1", color: "var(--gold-light)", fontSize: "0.8rem" }}>Password changed.</p>}
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6 }}>
        <button className="tpBtn tpBtnGold" type="submit" disabled={busy}>{busy ? "…" : "Update password"}</button>
        <button className="tpBtn" type="button" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

/** Cross-links + logged-in-as + change password + logout, shared across all /admin/* pages. */
export default function AdminBar() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    api<{ username: string }>("/api/tp/admin/me")
      .then((d) => setUsername(d.username))
      .catch(() => {});
  }, []);

  const logout = async () => {
    await jpost("/api/tp/admin/logout", {});
    // Hard navigation: guarantees a fresh server-rendered login page instead
    // of a client-router cache possibly reusing a stale ?next= from before.
    window.location.href = "/admin/login";
  };

  return (
    <div style={{ marginBottom: "1.2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.6rem" }}>
        <nav style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`tpBtn tpBtnSm ${pathname === l.href ? "tpBtnGold" : ""}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {username && <span className="tpMuted" style={{ fontSize: "0.8rem" }}>Logged in as <strong style={{ color: "var(--ivory)" }}>{username}</strong></span>}
          <button className="tpBtn tpBtnSm" onClick={() => setChanging((v) => !v)}>Change password</button>
          <button className="tpBtn tpBtnSm tpBtnDanger" onClick={logout}>Log out</button>
        </div>
      </div>
      {changing && (
        <div style={{ marginTop: "0.8rem" }}>
          <ChangePasswordForm onDone={() => setChanging(false)} />
        </div>
      )}
    </div>
  );
}
