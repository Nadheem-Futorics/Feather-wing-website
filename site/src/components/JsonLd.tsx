import React from "react";
import { siteUrl, contact, socials } from "@/data/site";
import { services } from "@/data/services";
import { faq } from "@/data/seo";

/** TravelAgency + Service + Breadcrumb + FAQ structured data. */
export default function JsonLd() {
  const agency = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: "Feather Wing Tours",
    slogan: "Your Journey. Our Passion.",
    url: siteUrl,
    logo: `${siteUrl}/brand/logo.png`,
    image: `${siteUrl}/media/finale.png`,
    telephone: contact.phone,
    email: contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Rakha",
      addressLocality: "Dammam",
      addressCountry: "SA",
    },
    sameAs: Object.values(socials).filter((s) => s.startsWith("http")),
    makesOffer: services.map((s) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: s.title.en, description: s.copy.en },
    })),
  };

  const serviceLd = services.map((s) => ({
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.title.en,
    description: s.copy.en,
    provider: { "@type": "TravelAgency", name: "Feather Wing Tours", url: siteUrl },
    areaServed: ["Saudi Arabia", "Worldwide"],
    url: `${siteUrl}/#svc-${s.id}`,
  }));

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Destinations", item: `${siteUrl}/#destinations` },
      { "@type": "ListItem", position: 3, name: "Services", item: `${siteUrl}/#services` },
      { "@type": "ListItem", position: 4, name: "Featured Trips", item: `${siteUrl}/#trips` },
      { "@type": "ListItem", position: 5, name: "Contact", item: `${siteUrl}/#contact` },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q.en,
      acceptedAnswer: { "@type": "Answer", text: f.a.en },
    })),
  };

  return (
    <>
      {[agency, breadcrumb, faqLd, ...serviceLd].map((obj, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
        />
      ))}
    </>
  );
}
