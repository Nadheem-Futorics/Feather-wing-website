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
            <a href={socials.instagram} aria-label="Instagram">IG</a>
            <a href={socials.facebook} aria-label="Facebook">FB</a>
            <a href={socials.tiktok} aria-label="TikTok">TT</a>
            <a href={socials.linkedin} aria-label="LinkedIn">IN</a>
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
          <p className={styles.editNote}>{t(dict.footer.editable)}</p>
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
