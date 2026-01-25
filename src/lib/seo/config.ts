export const SEO = {
  siteName: 'Pick A Park',
  siteUrl: 'https://pickapark.app',
  defaultDescription:
    'Discover your next park adventure. Random park picker for families.',
  defaultImage: '/og-default.png',
  themeColor: '#c9a227',
  tileColor: '#1a3a2f',
} as const

/** Build canonical URL from pathname */
export function canonical(pathname: string): string {
  return `${SEO.siteUrl}${pathname}`
}

/** Build absolute URL for OG images */
export function ogImage(path: string): string {
  return path.startsWith('http') ? path : `${SEO.siteUrl}${path}`
}
