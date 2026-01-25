import { createFileRoute } from '@tanstack/react-router'
import { SEO, canonical } from '../lib/seo/config'
import { Shield } from 'lucide-react'
import { FloatingParticles } from '../components/landing'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: `Privacy Policy - ${SEO.siteName}` },
      {
        name: 'description',
        content: `Privacy Policy for ${SEO.siteName}. Learn how we collect, use, and protect your data.`,
      },
      { property: 'og:title', content: `Privacy Policy - ${SEO.siteName}` },
      { property: 'og:url', content: canonical('/privacy') },
    ],
    links: [{ rel: 'canonical', href: canonical('/privacy') }],
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <div className="landing-container">
      <FloatingParticles />

      {/* Hero Section */}
      <section className="landing-hero" style={{ minHeight: '30vh' }}>
        <Shield
          size={48}
          style={{
            color: 'var(--color-gold)',
            marginBottom: '1rem',
            filter: 'drop-shadow(0 4px 12px rgba(212, 168, 75, 0.3))',
          }}
        />

        <h1
          className="title"
          style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}
        >
          <span className="text-gradient">Privacy Policy</span>
        </h1>

        <p className="subtitle">Last updated: January 2026</p>
      </section>

      {/* Content Section */}
      <section className="landing-section">
        <div className="glass-card-accent">
          <div className="legal-prose">
            <section>
              <h2>Information We Collect</h2>

              <h3>Account Information</h3>
              <p>
                When you create an account, we collect information provided
                through our authentication provider (
                <a
                  href="https://clerk.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Clerk
                </a>
                ), which may include your name, email address, and profile
                picture.
              </p>

              <h3>Usage Data</h3>
              <p>
                We collect information about how you use the Service, including:
              </p>
              <ul>
                <li>Parks you add to your list</li>
                <li>Parks you pick and visit</li>
                <li>Notes and custom names you create</li>
                <li>Visit counts and history</li>
              </ul>

              <h3>Location Data</h3>
              <p>
                With your permission, we access your device's location to
                calculate travel times to parks and to show nearby parks in the
                Discover feature. Location data is used only in real-time and is
                not stored on our servers.
              </p>

              <h3>Support Communications</h3>
              <p>
                When you contact support or submit feedback, we collect your
                email address and the content of your message to respond to your
                inquiry.
              </p>
            </section>

            <section>
              <h2>How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul>
                <li>Provide and maintain the Service</li>
                <li>
                  Personalize your experience (your park list, stats,
                  preferences)
                </li>
                <li>Calculate travel times and show nearby parks</li>
                <li>Process payments and manage subscriptions</li>
                <li>Respond to support requests</li>
                <li>Send important service updates (not marketing)</li>
                <li>Improve the Service based on usage patterns</li>
              </ul>
            </section>

            <section>
              <h2>Third-Party Services</h2>
              <p>
                We use the following third-party services that may collect data:
              </p>

              <h3>Clerk</h3>
              <p>
                Authentication and billing. Clerk processes your login
                credentials and payment information. See{' '}
                <a
                  href="https://clerk.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Clerk's Privacy Policy
                </a>
                .
              </p>

              <h3>Stripe</h3>
              <p>
                Payment processing (via Clerk). Stripe handles credit card data
                securely. See{' '}
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Stripe's Privacy Policy
                </a>
                .
              </p>

              <h3>Google Maps</h3>
              <p>
                Park data, photos, and directions. Google receives location
                queries when you use travel time or discovery features. See{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google's Privacy Policy
                </a>
                .
              </p>

              <h3>Convex</h3>
              <p>
                Database and backend services. Your park list and activity data
                is stored on Convex servers. See{' '}
                <a
                  href="https://www.convex.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Convex's Privacy Policy
                </a>
                .
              </p>

              <h3>Vercel Analytics</h3>
              <p>
                Anonymous page view analytics. No personal data is collected.
                See{' '}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Vercel's Privacy Policy
                </a>
                .
              </p>
            </section>

            <section>
              <h2>Data Retention</h2>
              <p>
                We retain your account data and usage history for as long as
                your account is active. If you delete your account, we will
                delete your personal data within 30 days, except where we are
                required to retain it for legal or business purposes.
              </p>
              <p>
                Support tickets are retained for 2 years for quality assurance
                and to help with recurring issues.
              </p>
            </section>

            <section>
              <h2>Data Security</h2>
              <p>
                We implement appropriate security measures to protect your data,
                including encryption in transit (HTTPS) and at rest. However, no
                method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2>Your Rights</h2>
              <p>Depending on your location, you may have the right to:</p>
              <ul>
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data in a portable format</li>
                <li>Opt out of certain data processing</li>
              </ul>
              <p>
                To exercise these rights, please contact us at{' '}
                <a href="/help">our support page</a>.
              </p>
            </section>

            <section>
              <h2>Children's Privacy</h2>
              <p>
                The Service is not intended for children under 13. We do not
                knowingly collect data from children under 13. If you believe a
                child has provided us with personal data, please contact us.
              </p>
            </section>

            <section>
              <h2>Changes to This Policy</h2>
              <p>
                We may update this policy from time to time. We will notify you
                of material changes by posting the updated policy on the Service
                or by email. Continued use of the Service after changes
                constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2>Contact</h2>
              <p>
                For privacy-related questions or concerns, please contact us at{' '}
                <a href="/help">our support page</a>.
              </p>
            </section>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-links">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/pricing">Pricing</a>
          <a href="/help">Help</a>
          <a href="/terms">Terms</a>
        </div>
        <p
          style={{
            marginTop: '1.5rem',
            marginBottom: 0,
            fontSize: '0.8125rem',
            color: 'var(--color-sage)',
          }}
        >
          A{' '}
          <a
            href="https://resonantprojects.art"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-sage)' }}
          >
            Resonant Projects
          </a>{' '}
          creation
        </p>
      </footer>
    </div>
  )
}
