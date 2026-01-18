// JSON-LD Schema definitions for structured data

const siteUrl = import.meta.env.SITE_URL || "https://todayspark.app";

export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Today's Park",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  description:
    "Random park picker for families exploring local parks. Discover your next adventure.",
  url: siteUrl,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free tier available with daily limit. Premium plans available.",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "150",
    bestRating: "5",
    worstRating: "1",
  },
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Today's Park",
  url: siteUrl,
  description:
    "Random park picker for families exploring local parks. End the 'which park?' debate forever.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/discover?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Today's Park",
  url: siteUrl,
  logo: `${siteUrl}/favicon.svg`,
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: `${siteUrl}/help/contact`,
  },
};

// Combined schema for homepage - includes WebSite and SoftwareApplication
export const homepageSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "Today's Park",
      url: siteUrl,
      description: "Random park picker for families exploring local parks",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/discover?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Today's Park",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/favicon.svg`,
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#app`,
      name: "Today's Park",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      description:
        "Random park picker for families. End the 'which park?' debate and discover local adventures.",
      url: siteUrl,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free tier available",
      },
    },
    {
      "@type": "WebPage",
      "@id": `${siteUrl}/#webpage`,
      url: siteUrl,
      name: "Today's Park - Random Park Picker for Families",
      isPartOf: {
        "@id": `${siteUrl}/#website`,
      },
      about: {
        "@id": `${siteUrl}/#app`,
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
  name: "How to Use Today's Park",
  description:
    "Learn how to use Today's Park to discover and explore local parks with your family.",
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
