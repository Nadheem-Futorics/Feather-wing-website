"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "../../trips/planner.css";
import PlannerShell from "@/components/planner/PlannerShell";
import { jpost } from "@/lib/tp-client";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin/trip-enquiries";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await jpost("/api/tp/admin/login", { username, password });
      router.push(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tpNarrow" style={{ maxWidth: 420 }}>
      <p className="kicker">Admin Portal</p>
      <h1 className="serif tpH1" style={{ marginBottom: "1.4rem" }}>Sign in</h1>
      <form className="tpCard" onSubmit={submit}>
        <div className="tpField">
          <label htmlFor="username">Username</label>
          <input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </div>
        <div className="tpField">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {err && <p className="tpErr">{err}</p>}
        <button className="tpBtn tpBtnGold" type="submit" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <PlannerShell>
      <Suspense fallback={null}>
        <LoginInner />
      </Suspense>
    </PlannerShell>
  );
}
