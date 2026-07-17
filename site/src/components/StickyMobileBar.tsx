"use client";

import React, { useState } from "react";
import { useLang, dict } from "@/lib/i18n";
import { useScrollWatcher } from "@/lib/motion";
import { contact } from "@/data/site";
import styles from "./StickyMobileBar.module.css";

/** Sticky bottom actions on mobile: Plan Journey + WhatsApp + Call. */
export default function StickyMobileBar() {
  const { t } = useLang();
  const [show, setShow] = useState(false);

  useScrollWatcher(() => setShow(window.scrollY > window.innerHeight * 1.2));

  return (
    <div className={`${styles.bar} ${show ? styles.on : ""}`}>
      <a href="#enquiry" className={styles.plan}>
        {t(dict.nav.plan)}
      </a>
      <a
        href={`https://wa.me/${contact.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.icon}
        aria-label="WhatsApp"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1a13 13 0 0 1-1.5-.5 11.5 11.5 0 0 1-4.4-3.9 5 5 0 0 1-1-2.7c0-1.3.7-2 1-2.2a1 1 0 0 1 .7-.3h.5c.2 0 .4 0 .6.4l.9 2.1c0 .2.1.3 0 .5l-.3.5-.5.5c-.1.2-.3.3-.1.6a9.6 9.6 0 0 0 1.7 2.2 9 9 0 0 0 2.5 1.5c.3.2.5.1.6 0l.8-.9c.2-.3.4-.2.6-.1l2 1c.2.1.4.2.4.3.1.1.1.7-.2 1.4Z" />
        </svg>
      </a>
      <a href={`tel:${contact.phone}`} className={styles.icon} aria-label={t(dict.form.call)}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M6.6 10.8a15.6 15.6 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z" />
        </svg>
      </a>
    </div>
  );
}
