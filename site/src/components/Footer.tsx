"use client";

import React from "react";
import { useLang, dict } from "@/lib/i18n";
import { contact, socials, brand } from "@/data/site";
import Logo from "./Logo";
import styles from "./Footer.module.css";

export default function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className={styles.root}>
      <div className={`wrap ${styles.top}`}>
        <div className={styles.brandCol}>
          <Logo height={54} stacked />
          <p className={styles.brandLine}>{t(brand.footerLine)}</p>
          <div className={styles.socials}>
            {/* EDITABLE — replace # placeholders in src/data/site.ts */}
            <a href={socials.instagram} aria-label="Instagram" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href={socials.facebook} aria-label="Facebook" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.48-3.9 3.77-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.9h-2.33v7A10 10 0 0 0 22 12Z" />
              </svg>
            </a>
            <a href={socials.tiktok} aria-label="TikTok" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M16.5 3c.4 2.1 1.9 3.6 4 3.9v2.8a7 7 0 0 1-4-1.3v6.4a5.6 5.6 0 1 1-5.6-5.6c.2 0 .5 0 .7.05v2.9a2.7 2.7 0 1 0 1.9 2.6V3h3Z" />
              </svg>
            </a>
            <a href={socials.linkedin} aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3a1.96 1.96 0 1 0 0 3.92A1.96 1.96 0 0 0 5.25 3ZM20.45 20h-3.37v-5.6c0-1.34-.03-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V20h-3.37V8.5h3.24v1.57h.05c.45-.85 1.56-1.75 3.2-1.75 3.42 0 4.05 2.25 4.05 5.18V20Z" />
              </svg>
            </a>
          </div>
        </div>

        <nav className={styles.col} aria-label={t(dict.footer.company)}>
          <h3>{t(dict.footer.company)}</h3>
          <a href="#about">{t(dict.footer.aboutUs)}</a>
          <a href="#about">{t(dict.footer.whyUs)}</a>
          <a href="#contact">{t(dict.footer.contact)}</a>
        </nav>

        <nav className={styles.col} aria-label={t(dict.footer.travel)}>
          <h3>{t(dict.footer.travel)}</h3>
          <a href="#svc-ticket-booking">{t({ en: "Ticket Booking", ar: "حجز التذاكر" })}</a>
          <a href="#svc-visa-services">{t({ en: "Visa Services", ar: "خدمات التأشيرات" })}</a>
          <a href="#svc-scheduled-trips">{t({ en: "Scheduled Trips", ar: "الرحلات المجدولة" })}</a>
          <a href="#svc-car-trips">{t({ en: "Car Trips", ar: "رحلات السيارات" })}</a>
          <a href="#svc-desert-camping">{t({ en: "Desert Camping", ar: "التخييم الصحراوي" })}</a>
        </nav>

        <nav className={styles.col} aria-label={t(dict.footer.programs)}>
          <h3>{t(dict.footer.programs)}</h3>
          <a href="#svc-umrah-services">{t({ en: "Umrah Services", ar: "خدمات العمرة" })}</a>
          <a href="#svc-islamic-travel">{t({ en: "Islamic Destination Travel", ar: "الوجهات الإسلامية" })}</a>
          <a href="#svc-gathering-programs">{t({ en: "Gathering Management", ar: "إدارة التجمعات" })}</a>
          <a href="#svc-corporate-events">{t({ en: "Corporate Events", ar: "فعاليات الشركات" })}</a>
          <a href="#svc-employee-wellbeing">{t({ en: "Employee Wellbeing", ar: "رفاهية الموظفين" })}</a>
        </nav>

        <nav className={styles.col} aria-label={t(dict.footer.support)}>
          <h3>{t(dict.footer.support)}</h3>
          <a href="#faq">{t(dict.footer.faq)}</a>
          <a href="#privacy">{t(dict.footer.privacy)}</a>
          <a href="#terms">{t(dict.footer.terms)}</a>
          <a href="#cancellation">{t(dict.footer.cancellation)}</a>
        </nav>

        <div className={styles.col}>
          <h3>{t(dict.footer.contact)}</h3>
          <p>
            <strong>{t(dict.footer.phone)}:</strong> <span dir="ltr">{contact.phone}</span>
          </p>
          <p>
            <strong>WhatsApp:</strong> <span dir="ltr">+{contact.whatsapp}</span>
          </p>
          <p>
            <strong>{t(dict.footer.email)}:</strong> <span dir="ltr">{contact.email}</span>
          </p>
          <p>
            <strong>{t(dict.footer.address)}:</strong> {contact.address}
          </p>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={`wrap ${styles.bottomInner}`}>
          <span>
            © {year} Feather Wing Tours. {t(dict.footer.rights)}
          </span>
          <span className={styles.tag}>{t(brand.tagline)}</span>
        </div>
      </div>
    </footer>
  );
}
