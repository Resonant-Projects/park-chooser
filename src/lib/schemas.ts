// JSON-LD Schema definitions for structured data

const siteUrl = import.meta.env.SITE_URL || "https://todayspark.app";

export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Today's Park",
  "applicationCategory": "LifestyleApplication",
  "operatingSystem": "Web",
  "description": "Random park picker for families exploring local parks. Discover your next adventure.",
  "url": siteUrl,
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free tier available"
  }
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Today's Park",
  "url": siteUrl,
  "description": "Random park picker for families exploring local parks"
};

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Today's Park",
  "url": siteUrl,
  "logo": `${siteUrl}/favicon.svg`
};

export function createFaqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}
