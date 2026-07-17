"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLang, dict } from "@/lib/i18n";
import { contact } from "@/data/site";
import styles from "./ChatWidget.module.css";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type NdjsonEvent =
  | { type: "meta"; provider: string }
  | { type: "text"; delta: string }
  | { type: "notice"; message: string }
  | { type: "done" }
  | { type: "error"; message: string };

/* ── Minimal typings for the non-standard (webkit-prefixed) SpeechRecognition API ── */
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// The Web Speech API has no standardized gender field on SpeechSynthesisVoice,
// so this is a name-based heuristic — covers the common Windows/Edge, macOS/
// Safari, and Chrome/Android voice packs for both English and Arabic. Sarah
// is voiced as female, matching her name/persona.
const FEMALE_VOICE_HINTS = [
  "female", "zira", "aria", "jenny", "michelle", "samantha", "victoria", "karen",
  "moira", "tessa", "fiona", "susan", "linda", "heera", "salma", "hoda", "amira",
  "nora", "lily", "emma", "sonia", "elena", "catherine", "ava", "sara", "sarah",
];
const MALE_VOICE_HINTS = [
  "male", "david", "mark", "guy", "george", "daniel", "alex", "naayf", "hamed",
  "fred", "james", "ryan", "tom", "oliver", "matthew",
];

function pickNaturalVoice(lang: "en" | "ar"): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const prefix = lang === "ar" ? "ar" : "en";
  const inPrefix = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  const pool = inPrefix.length ? inPrefix : voices;

  const isFemale = (v: SpeechSynthesisVoice) => FEMALE_VOICE_HINTS.some((h) => v.name.toLowerCase().includes(h));
  const isMale = (v: SpeechSynthesisVoice) => MALE_VOICE_HINTS.some((h) => v.name.toLowerCase().includes(h));
  const isNatural = (v: SpeechSynthesisVoice) => /natural|neural|online/i.test(v.name);

  return (
    pool.find((v) => isFemale(v) && isNatural(v)) ??
    pool.find(isFemale) ??
    pool.find((v) => isNatural(v) && !isMale(v)) ??
    pool.find((v) => !isMale(v)) ??
    pool[0] ??
    null
  );
}

/**
 * Floating customer-facing concierge chat — distinct from the trip planner's
 * trip-scoped assistant. Public, unauthenticated, EN/AR, backed by /api/concierge.
 * Talks back using the browser's own speech synthesis (no server cost / API key)
 * and accepts spoken questions via the browser's speech recognition, when supported.
 */
export default function ChatWidget() {
  const { t, lang, dir } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [ttsSupported, setTtsSupported] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    const hasTts = "speechSynthesis" in window;
    const hasStt = !!getSpeechRecognitionCtor();
    if (hasTts) window.speechSynthesis.getVoices(); // warm up async voice list
    let savedOff = false;
    try {
      savedOff = localStorage.getItem("fwt-concierge-voice") === "off";
    } catch {}
    queueMicrotask(() => {
      setTtsSupported(hasTts);
      setSpeechSupported(hasStt);
      if (savedOff) setVoiceOn(false);
    });
    return () => {
      if (hasTts) window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = t(dict.concierge.greeting);
      queueMicrotask(() => setMessages([{ role: "assistant", content: greeting }]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const speak = useCallback(
    (text: string) => {
      if (!ttsSupported || !voiceOn || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang === "ar" ? "ar-SA" : "en-US";
      const voice = pickNaturalVoice(lang);
      if (voice) utter.voice = voice;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    },
    [ttsSupported, voiceOn, lang]
  );

  function toggleVoice() {
    setVoiceOn((v) => {
      const next = !v;
      if (!next && "speechSynthesis" in window) window.speechSynthesis.cancel();
      try {
        localStorage.setItem("fwt-concierge-voice", next ? "on" : "off");
      } catch {}
      return next;
    });
  }

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || busy) return;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setErrorMsg(null);
    setInput("");
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    setBusy(true);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    let assistantText = "";
    try {
      const res = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
          lang,
        }),
      });
      if (!res.ok || !res.body) throw new Error("request_failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev: NdjsonEvent;
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === "meta") setDevMode(ev.provider !== "anthropic");
          if (ev.type === "text") {
            assistantText += ev.delta;
            const snapshot = assistantText;
            setMessages((m) => {
              const next = [...m];
              next[next.length - 1] = { role: "assistant", content: snapshot };
              return next;
            });
          }
          if (ev.type === "notice") setDevMode(true);
          if (ev.type === "error") setErrorMsg(ev.message);
        }
      }
      if (assistantText.trim()) speak(assistantText.trim());
    } catch {
      setErrorMsg(t(dict.concierge.error));
    } finally {
      setBusy(false);
    }
  }

  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const rec = new Ctor();
    rec.lang = lang === "ar" ? "ar-SA" : "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    transcriptRef.current = "";
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      transcriptRef.current = transcript;
      setInput(transcript);
    };
    rec.onend = () => {
      setListening(false);
      const finalText = transcriptRef.current.trim();
      if (finalText) sendRef.current(finalText);
    };
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <div className={styles.root} dir={dir}>
      {open && (
        <div className={styles.panel} role="dialog" aria-label={t(dict.concierge.title)}>
          <header className={styles.header}>
            <div>
              <strong>{t(dict.concierge.title)}</strong>
              <p>{t(dict.concierge.subtitle)}</p>
            </div>
            <div className={styles.headerBtns}>
              {ttsSupported && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  aria-label={t(voiceOn ? dict.concierge.voiceOn : dict.concierge.voiceOff)}
                  aria-pressed={voiceOn}
                  className={`${styles.iconToggle} ${speaking ? styles.speakingPulse : ""}`}
                >
                  {voiceOn ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                      <path d="M4 9v6h4l5 5V4L8 9H4Zm11.5 3a4.5 4.5 0 0 0-2.3-3.9v7.8A4.5 4.5 0 0 0 15.5 12Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                      <path d="M4 9v6h4l5 5V4L8 9H4Zm14.7-1.8-1.4 1.4 1.6 1.6-1.6 1.6 1.4 1.4L20.3 12l1.6-1.6-1.4-1.4L18.9 10l-1.6-1.6Z" />
                    </svg>
                  )}
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label={t(dict.concierge.close)} className={styles.closeBtn}>
                ✕
              </button>
            </div>
          </header>

          {devMode && <div className={styles.devBanner}>{t(dict.concierge.devNotice)}</div>}

          <div className={styles.body} ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? styles.bubbleUser : styles.bubbleBot}>
                {m.content || (busy && i === messages.length - 1 ? "…" : "")}
              </div>
            ))}
            {errorMsg && <div className={styles.errorBubble}>{errorMsg}</div>}
          </div>

          <div className={styles.quickLinks}>
            <a href="#enquiry" onClick={() => setOpen(false)} className={styles.quickLink}>
              {t(dict.concierge.quoteCta)}
            </a>
            <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className={styles.quickLink}>
              {t(dict.concierge.whatsappCta)}
            </a>
          </div>

          <form
            className={styles.inputRow}
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                aria-label={t(listening ? dict.concierge.micStop : dict.concierge.micStart)}
                aria-pressed={listening}
                disabled={busy}
                className={`${styles.micBtn} ${listening ? styles.micOn : ""}`}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
                  <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V21h2v-2.07A7 7 0 0 0 19 12h-2Z" />
                </svg>
              </button>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? t(dict.concierge.listening) : t(dict.concierge.placeholder)}
              disabled={busy}
              className={styles.input}
            />
            <button type="submit" disabled={busy || !input.trim()} className={styles.sendBtn} aria-label={t(dict.concierge.send)}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M3 11.5 20.5 3l-6 18-3.8-7.7L3 11.5Z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={styles.launcher}
        aria-label={t(dict.concierge.launcherLabel)}
        aria-expanded={open}
      >
        {open ? (
          "✕"
        ) : (
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
            <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
