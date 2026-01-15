// @ts-check
import { defineConfig } from 'astro/config';
import clerk from '@clerk/astro'
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://todayspark.app',
  output: 'server',
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [
    clerk(),
    sitemap({
      filter: (page) => {
        // Exclude auth, protected, and API pages from sitemap
        const excludePatterns = [
          '/sign-in',
          '/sign-up',
          '/stats',
          '/manage',
          '/discover',
          '/account',
          '/help/feedback',
          '/api/',
          '/r/',
        ];
        return !excludePatterns.some(pattern => page.includes(pattern));
      },
    }),
  ],
  adapter: vercel()
});