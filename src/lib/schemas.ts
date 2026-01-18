// JSON-LD Schema definitions for structured data
import { SITE_NAME, SITE_URL, APP_SUBTITLE } from "./config";

export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  description:
    "Random park picker for families exploring local parks. Discover your next adventure.",
  url: SITE_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free tier available with daily limit. Premium plans available.",
  },
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description:
    "Random park picker for families exploring local parks. End the 'which park?' debate forever.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/discover?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: `${SITE_URL}/help/contact`,
  },
};

// Combined schema for homepage - includes WebSite and SoftwareApplication
export const homepageSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      ...websiteSchema,
      "@context": undefined,
      "@id": `${SITE_URL}/#website`,
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
    },
    {
      ...organizationSchema,
      "@context": undefined,
      "@id": `${SITE_URL}/#organization`,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/favicon.svg`,
      },
    },
    {
      ...softwareApplicationSchema,
      "@context": undefined,
      "@id": `${SITE_URL}/#app`,
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: `${SITE_NAME} - ${APP_SUBTITLE}`,
      isPartOf: {
        "@id": `${SITE_URL}/#website`,
      },
      about: {
        "@id": `${SITE_URL}/#app`,
      },
      description:
        "Discover your next park adventure. Random park picker that helps families explore local parks without the debate.",
    },
  ],
};

export function createFaqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

// Breadcrumb schema generator
export function createBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ItemList schema generator for lists of items (e.g., park stats)
export function createItemListSchema(
  items: Array<{ name: string; url?: string; position?: number }>,
  listName: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: item.position ?? index + 1,
      name: item.name,
      ...(item.url && { url: item.url }),
    })),
  };
}

// HowTo schema for the about page
export const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: `How to Use ${SITE_NAME}`,
  description: `Learn how to use ${SITE_NAME} to discover and explore local parks with your family.`,
  step: [
    {
      "@type": "HowToStep",
      name: "Build Your List",
      text: "Add parks from our recommendations or discover new ones nearby.",
      position: 1,
    },
    {
      "@type": "HowToStep",
      name: "Pick a Park",
      text: "Hit the button and we'll randomly select from your list (no repeats in the last 5 picks).",
      position: 2,
    },
    {
      "@type": "HowToStep",
      name: "Go Explore",
      text: "Get directions, see travel time, and head out on your adventure.",
      position: 3,
    },
  ],
};
