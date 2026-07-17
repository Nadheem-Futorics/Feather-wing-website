"use client";

import React, { useEffect, useState } from "react";
import Logo from "./Logo";
import { useLang, dict } from "@/lib/i18n";
import { useScrollWatcher } from "@/lib/motion";
import { saudiDestinations, internationalDestinations } from "@/data/destinations";
import styles from "./Navbar.module.css";

const links = [
  { href: "/#home", key: "home" },
  { href: "/#destinations", key: "destinations" },
  { href: "/#services", key: "services" },
  { href: "/#trips", key: "trips" },
  { href: "/trip-planner", key: "planner" },
  { href: "/#about", key: "about" },
  { href: "/#contact", key: "contact" },
] as const;

export default function Navbar() {
  const { t, lang, setLang } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");

  useScrollWatcher(() => setScrolled(window.scrollY > window.innerHeight * 0.6));

  // active-section indicator (scroll math — IO is unreliable in some webviews)
  useScrollWatcher(() => {
    const ids = ["home", "services", "trips", "about", "contact"];
    const mid = window.innerHeight / 2;
    let current = "home";
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) current = id;
    }
    // destinations = inside the hero journey, past the intro sequences
    const home = document.getElementById("home");
    if (home && current === "home") {
      const r = home.getBoundingClientRect();
      if (r.top < -window.innerHeight * 2 && r.bottom > mid) current = "destinations";
    }
    setActive(current);
  });

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`}>
        <div className={styles.inner}>
          <a href="#home" className={styles.logoLink} aria-label="Feather Wing Tours — home">
            <Logo height={40} />
          </a>

          <nav className={styles.links} aria-label={t({ en: "Primary navigation", ar: "التنقل الرئيسي" })}>
            {links.map((l) => (
              <a
                key={l.key}
                href={l.href}
                className={`${styles.link} ${active === l.href.replace("/#", "") ? styles.active : ""}`}
              >
                {t(dict.nav[l.key])}
              </a>
            ))}
          </nav>

          <div className={styles.actions}>
            <button
              className={styles.lang}
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              aria-label={t({ en: "Switch language to Arabic", ar: "تغيير اللغة إلى الإنجليزية" })}
            >
              {t(dict.nav.langLabel)}
            </button>
            <a href="#enquiry" className={`btn btn-gold ${styles.planBtn}`} data-cursor="book">
              {t(dict.nav.plan)}
            </a>
            <button
              className={styles.burger}
              onClick={() => setOpen(true)}
              aria-label={t(dict.nav.menu)}
              aria-expanded={open}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen destination menu */}
      <div className={`${styles.menu} ${open ? styles.menuOpen : ""}`} aria-hidden={!open}>
        <div className={styles.menuHead}>
          <Logo height={38} />
          <button className={styles.close} onClick={() => setOpen(false)} aria-label={t(dict.nav.close)}>
            ✕
          </button>
        </div>
        <div className={styles.menuBody}>
          <nav className={styles.menuLinks} aria-label={t({ en: "Menu", ar: "القائمة" })}>
            {links.map((l, i) => (
              <a key={l.key} href={l.href} style={{ transitionDelay: `${i * 45}ms` }} onClick={() => setOpen(false)}>
                <span className={styles.menuIndex}>{String(i + 1).padStart(2, "0")}</span>
                {t(dict.nav[l.key])}
              </a>
            ))}
            <a href="#enquiry" className="btn btn-gold" style={{ marginTop: "1.4rem" }} onClick={() => setOpen(false)}>
              {t(dict.nav.plan)}
            </a>
          </nav>
          <div className={styles.menuDest}>
            <p className="kicker">{t(dict.nav.destinations)}</p>
            <ul>
              {[...saudiDestinations.slice(0, 8), ...internationalDestinations.slice(0, 4)].map((d) => (
                <li key={d.id}>
                  <a href="#destinations" onClick={() => setOpen(false)}>
                    {t(d.title)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
