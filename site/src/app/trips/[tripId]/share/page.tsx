"use client";

import { use, useCallback, useEffect, useState } from "react";
import "../../planner.css";
import PlannerShell from "@/components/planner/PlannerShell";
import { useLang } from "@/lib/i18n";
import { tp } from "@/lib/tp-i18n";
import { api, jpost, type MemberDto } from "@/lib/tp-client";

interface Data {
  members: MemberDto[]; role: string; meId: string;
  activity: { id: string; action: string; target: string | null; at: string; actor: string }[];
  comments: { id: string; body: string; at: string; author: string }[];
}

export default function SharePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const { t, lang } = useLang();
  const [data, setData] = useState<Data | null>(null);
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");

  const load = useCallback(() => {
    api<Data>(`/api/tp/trips/${tripId}/share`).then(setData);
  }, [tripId]);
  useEffect(() => {
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, [load]);

  const fmtAt = (iso: string) => new Date(iso).toLocaleString(lang === "ar" ? "ar" : "en", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <PlannerShell tripId={tripId}>
      <div className="tpNarrow">
        <p className="kicker">{t(tp.planner.share)}</p>
        <h1 className="serif tpH1" style={{ marginBottom: "1rem" }}>{t(tp.planner.share)}</h1>

        {/* Display name (used in comments/activity) */}
        <div className="tpCard" style={{ marginBottom: "1rem", display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
          <div className="tpField" style={{ margin: 0, flex: 1, minWidth: 200 }}>
            <label htmlFor="s-name">{t(tp.share.yourName)}</label>
            <input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={data?.members.find((m) => m.profileId === data.meId)?.displayName ?? ""} />
          </div>
          <button className="tpBtn" onClick={async () => { if (name.trim()) { await jpost("/api/tp/profile", { displayName: name.trim() }, "PATCH"); setName(""); load(); } }}>✓</button>
        </div>

        {data?.role === "owner" && (
          <div className="tpCard" style={{ marginBottom: "1rem" }}>
            <h2 className="serif" style={{ color: "var(--white)", fontSize: "1.15rem", marginBottom: "0.6rem" }}>{t(tp.share.invite)}</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={role} onChange={(e) => setRole(e.target.value as never)} aria-label={t(tp.share.role)}
                style={{ minHeight: 44, background: "rgba(3,6,17,0.6)", border: "1px solid rgba(115,85,216,0.4)", borderRadius: 10, color: "var(--ivory)", padding: "0 0.8rem" }}>
                <option value="editor">{t(tp.share.editor)}</option>
                <option value="viewer">{t(tp.share.viewer)}</option>
              </select>
              <button className="tpBtn tpBtnGold" onClick={async () => {
                const r = await jpost<{ url: string; token: string }>(`/api/tp/trips/${tripId}/share`, { op: "invite", invite: { role } });
                setLink(r.url.startsWith("http") ? r.url : `${location.origin}/trips/join?token=${r.token}`);
                setCopied(false);
              }}>
                {t(tp.share.createLink)}
              </button>
            </div>
            {link && (
              <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                <code style={{ background: "rgba(3,6,17,0.7)", padding: "0.5rem 0.7rem", borderRadius: 8, fontSize: "0.75rem", color: "var(--gold-light)", overflowWrap: "anywhere" }}>{link}</code>
                <button className="tpBtn tpBtnSm" onClick={() => { navigator.clipboard.writeText(link).then(() => setCopied(true)); }}>
                  {copied ? t(tp.share.copied) : t(tp.share.copy)}
                </button>
              </div>
            )}
            <p className="tpMuted" style={{ fontSize: "0.72rem", marginTop: 8 }}>{t(tp.share.linkNote)}</p>
          </div>
        )}

        <h2 className="serif" style={{ color: "var(--white)", fontSize: "1.15rem", marginBottom: "0.5rem" }}>{t(tp.share.members)}</h2>
        {data?.members.map((m) => (
          <div key={m.id} className="tpItem">
            <div className="tpItemBody" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--ivory)" }}>{m.displayName}{m.profileId === data.meId ? ` (${t({ en: "you", ar: "أنت" })})` : ""}</span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="tpBadge">{m.role}</span>
                {data.role === "owner" && m.role !== "owner" && (
                  <button className="tpBtn tpBtnSm tpBtnDanger" onClick={async () => { await jpost(`/api/tp/trips/${tripId}/share`, { op: "remove-member", profileId: m.profileId }); load(); }}>✕</button>
                )}
              </span>
            </div>
          </div>
        ))}

        <h2 className="serif" style={{ color: "var(--white)", fontSize: "1.15rem", marginBlock: "1.4rem 0.5rem" }}>{t(tp.share.comments)}</h2>
        <form onSubmit={async (e) => { e.preventDefault(); if (comment.trim()) { await jpost(`/api/tp/trips/${tripId}/share`, { op: "comment", body: comment.trim() }); setComment(""); load(); } }} style={{ display: "flex", gap: 8, marginBottom: "0.8rem" }}>
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t(tp.share.writeComment)} maxLength={1000}
            style={{ flex: 1, minHeight: 44, background: "rgba(3,6,17,0.6)", border: "1px solid rgba(115,85,216,0.4)", borderRadius: 10, color: "var(--ivory)", padding: "0 0.8rem" }} />
          <button className="tpBtn tpBtnGold" type="submit">➤</button>
        </form>
        {data?.comments.map((c) => (
          <div key={c.id} className="tpMsg tpMsgAi" style={{ marginBottom: 6, maxWidth: "100%" }}>
            <strong style={{ color: "var(--gold-light)" }}>{c.author}</strong> <span className="tpMuted" style={{ fontSize: "0.7rem" }}>{fmtAt(c.at)}</span>
            <div>{c.body}</div>
          </div>
        ))}

        <h2 className="serif" style={{ color: "var(--white)", fontSize: "1.15rem", marginBlock: "1.4rem 0.5rem" }}>{t(tp.share.activity)}</h2>
        {data?.activity.map((a) => (
          <p key={a.id} className="tpMuted" style={{ fontSize: "0.8rem", marginBottom: 4 }}>
            <strong style={{ color: "var(--ivory)" }}>{a.actor}</strong> — {a.action.replace(/[._]/g, " ")}{a.target ? `: ${a.target}` : ""} · {fmtAt(a.at)}
          </p>
        ))}
      </div>
    </PlannerShell>
  );
}
