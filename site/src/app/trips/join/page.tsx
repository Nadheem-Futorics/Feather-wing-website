"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "../planner.css";
import PlannerShell from "@/components/planner/PlannerShell";
import { useLang } from "@/lib/i18n";
import { tp } from "@/lib/tp-i18n";
import { jpost } from "@/lib/tp-client";

function JoinInner() {
  const { t } = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<"joining" | "ok" | "bad">("joining");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      queueMicrotask(() => setState("bad"));
      return;
    }
    jpost<{ tripId: string }>("/api/tp/invites/accept", { token })
      .then((d) => {
        setState("ok");
        setTimeout(() => router.push(`/trips/${d.tripId}`), 700);
      })
      .catch(() => setState("bad"));
  }, [params, router]);

  return (
    <div className="tpNarrow" style={{ textAlign: "center", paddingTop: "5rem" }}>
      <h1 className="serif tpH1">{t(tp.join.title)}</h1>
      <p className="tpMuted" role="status" style={{ marginTop: "1rem" }}>
        {state === "joining" && t(tp.join.joining)}
        {state === "ok" && t(tp.join.success)}
        {state === "bad" && t(tp.join.invalid)}
      </p>
    </div>
  );
}

export default function JoinPage() {
  return (
    <PlannerShell>
      <Suspense fallback={null}>
        <JoinInner />
      </Suspense>
    </PlannerShell>
  );
}
