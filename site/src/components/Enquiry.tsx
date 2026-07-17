"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLang, dict } from "@/lib/i18n";
import { services } from "@/data/services";
import { contact } from "@/data/site";
import styles from "./Enquiry.module.css";

type Status = "idle" | "sending" | "ok" | "error";

export default function Enquiry() {
  const { t, lang } = useLang();
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const startedAt = useRef(0);
  useEffect(() => {
    if (!startedAt.current) startedAt.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

    // client-side validation
    const errs: Record<string, string> = {};
    if (!data.name?.trim()) errs.name = t(dict.form.required);
    if (!data.mobile?.trim() || !/^[+\d][\d\s\-()]{6,18}$/.test(data.mobile.trim()))
      errs.mobile = data.mobile?.trim() ? t(dict.form.invalidPhone) : t(dict.form.required);
    if (!data.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))
      errs.email = data.email?.trim() ? t(dict.form.invalidEmail) : t(dict.form.required);
    if (!data.service) errs.service = t(dict.form.required);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStatus("sending");
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, elapsedMs: Date.now() - startedAt.current }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("ok");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  const field = (name: string, label: string, input: React.ReactNode) => (
    <div className={styles.field}>
      <label htmlFor={`f-${name}`}>{label}</label>
      {input}
      {errors[name] && (
        <span className={styles.err} role="alert">
          {errors[name]}
        </span>
      )}
    </div>
  );

  return (
    <section id="enquiry" className={`section ${styles.root}`} aria-label={t(dict.form.title)}>
      <div className="wrap">
        <p className="kicker">{t(dict.form.kicker)}</p>
        <h2 className="section-title serif">{t(dict.form.title)}</h2>

        <div className={styles.layout}>
          <form className={`glass ${styles.form}`} onSubmit={onSubmit} noValidate>
            {/* honeypot — spam prevention */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className={styles.hp} aria-hidden="true" />

            <div className={styles.row}>
              {field("name", t(dict.form.name), (
                <input id="f-name" name="name" type="text" autoComplete="name" required aria-invalid={!!errors.name} />
              ))}
              {field("mobile", t(dict.form.mobile), (
                <input id="f-mobile" name="mobile" type="tel" autoComplete="tel" dir="ltr" required aria-invalid={!!errors.mobile} />
              ))}
            </div>

            <div className={styles.row}>
              {field("email", t(dict.form.email), (
                <input id="f-email" name="email" type="email" autoComplete="email" dir="ltr" required aria-invalid={!!errors.email} />
              ))}
              {field("service", t(dict.form.service), (
                <select id="f-service" name="service" required defaultValue="" aria-invalid={!!errors.service}>
                  <option value="" disabled>
                    {t(dict.form.choose)}
                  </option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {lang === "ar" ? s.title.ar : s.title.en}
                    </option>
                  ))}
                  <option value="other">{t(dict.form.optionOther)}</option>
                </select>
              ))}
            </div>

            <div className={styles.row}>
              {field("destination", t(dict.form.destination), (
                <input id="f-destination" name="destination" type="text" />
              ))}
              {field("departure", t(dict.form.departure), (
                <input id="f-departure" name="departure" type="text" />
              ))}
            </div>

            <div className={styles.row}>
              {field("date", t(dict.form.date), <input id="f-date" name="date" type="date" />)}
              {field("travellers", t(dict.form.travellers), (
                <input id="f-travellers" name="travellers" type="number" min={1} max={500} defaultValue={2} />
              ))}
            </div>

            {field("contactMethod", t(dict.form.contactMethod), (
              <select id="f-contactMethod" name="contactMethod" defaultValue="whatsapp">
                <option value="phone">{t(dict.form.methods.phone)}</option>
                <option value="whatsapp">{t(dict.form.methods.whatsapp)}</option>
                <option value="email">{t(dict.form.methods.email)}</option>
              </select>
            ))}

            {field("notes", t(dict.form.notes), (
              <textarea id="f-notes" name="notes" rows={4} />
            ))}

            <div className={styles.actions}>
              <button type="submit" className="btn btn-gold" disabled={status === "sending"} data-cursor="book">
                {status === "sending" ? t(dict.form.submitting) : t(dict.form.submit)}
              </button>
              <a className="btn btn-ghost" href={`tel:${contact.phone}`}>
                ☎ {t(dict.form.call)}
              </a>
              <a
                className="btn btn-ghost"
                href={`https://wa.me/${contact.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t(dict.form.whatsappBtn)}
              </a>
            </div>

            {status === "ok" && (
              <p className={styles.success} role="status">
                ✓ {t(dict.form.success)}
              </p>
            )}
            {status === "error" && (
              <p className={styles.error} role="alert">
                {t(dict.form.error)}
              </p>
            )}
          </form>

          <aside className={styles.aside}>
            <div className={styles.asideCard}>
              <h3 className="serif">{t({ en: "Direct contact", ar: "تواصل مباشر" })}</h3>
              <p className={styles.placeholderNote}>{t(dict.footer.editable)}</p>
              <ul>
                <li>
                  <strong>{t(dict.footer.phone)}</strong> <span dir="ltr">{contact.phone}</span>
                </li>
                <li>
                  <strong>{t(dict.footer.email)}</strong> <span dir="ltr">{contact.email}</span>
                </li>
                <li>
                  <strong>{t(dict.footer.address)}</strong> {contact.address}
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
