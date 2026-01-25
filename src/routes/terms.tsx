import { createFileRoute } from '@tanstack/react-router'
import { SEO, canonical } from '../lib/seo/config'
import { FileText } from 'lucide-react'
import { FloatingParticles } from '../components/landing'

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [
      { title: `Terms of Service - ${SEO.siteName}` },
      {
        name: 'description',
        content: `Terms of Service for ${SEO.siteName}. Read our terms covering accounts, subscriptions, billing, and acceptable use.`,
      },
      { property: 'og:title', content: `Terms of Service - ${SEO.siteName}` },
      { property: 'og:url', content: canonical('/terms') },
    ],
    links: [{ rel: 'canonical', href: canonical('/terms') }],
  }),
  component: TermsPage,
})

function TermsPage() {
  return (
    <div className="landing-container">
      <FloatingParticles />

      {/* Hero Section */}
      <section className="landing-hero" style={{ minHeight: '30vh' }}>
        <FileText
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
          <span className="text-gradient">Terms of Service</span>
        </h1>

        <p className="subtitle">Last updated: January 2026</p>
      </section>

      {/* Content Section */}
      <section className="landing-section">
        <div className="glass-card-accent">
          <div className="legal-prose">
            <section>
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using Pick a Park ("the Service"), you agree to
                be bound by these Terms of Service. If you do not agree to these
                terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2>2. Description of Service</h2>
              <p>
                Pick a Park is a web application that helps users discover and
                track visits to local parks. The Service includes features for
                managing park lists, random park selection, and visit tracking.
              </p>
            </section>

            <section>
              <h2>3. User Accounts</h2>
              <p>
                To use certain features, you must create an account through our
                authentication provider (
                <a
                  href="https://clerk.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Clerk
                </a>
                ). You are responsible for maintaining the confidentiality of
                your account credentials and for all activities that occur under
                your account.
              </p>
            </section>

            <section>
              <h2>4. Subscription & Billing</h2>
              <p>
                Some features require a paid subscription. Subscriptions are
                billed through{' '}
                <a
                  href="https://stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Stripe
                </a>{' '}
                via Clerk Billing. By subscribing, you authorize us to charge
                your payment method on a recurring basis until you cancel.
              </p>
              <ul>
                <li>
                  Subscription fees are charged at the beginning of each billing
                  period
                </li>
                <li>
                  You may cancel your subscription at any time through your
                  account settings
                </li>
                <li>
                  Cancellations take effect at the end of the current billing
                  period
                </li>
                <li>We do not provide refunds for partial billing periods</li>
              </ul>
            </section>

            <section>
              <h2>5. User Content</h2>
              <p>
                You retain ownership of any content you create within the
                Service (such as park notes or custom names). By using the
                Service, you grant us a license to store and display this
                content as necessary to provide the Service to you.
              </p>
            </section>

            <section>
              <h2>6. Prohibited Uses</h2>
              <p>You agree not to:</p>
              <ul>
                <li>Use the Service for any unlawful purpose</li>
                <li>
                  Attempt to gain unauthorized access to the Service or its
                  systems
                </li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>
                  Scrape, crawl, or use automated tools to access the Service
                  without permission
                </li>
                <li>Impersonate any person or entity</li>
              </ul>
            </section>

            <section>
              <h2>7. Third-Party Services</h2>
              <p>
                The Service integrates with third-party services including{' '}
                <a
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Maps
                </a>{' '}
                (for park data and directions),{' '}
                <a
                  href="https://clerk.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Clerk
                </a>{' '}
                (for authentication and billing), and{' '}
                <a
                  href="https://stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Stripe
                </a>{' '}
                (for payment processing). Your use of these services is subject
                to their respective terms and privacy policies.
              </p>
            </section>

            <section>
              <h2>8. Disclaimer of Warranties</h2>
              <p>
                The Service is provided "as is" without warranties of any kind.
                We do not guarantee the accuracy of park information,
                availability of the Service, or that the Service will meet your
                specific needs. Park conditions, hours, and amenities may change
                without notice.
              </p>
            </section>

            <section>
              <h2>9. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, we shall not be liable
                for any indirect, incidental, special, or consequential damages
                arising from your use of the Service. Our total liability shall
                not exceed the amount you paid us in the 12 months preceding the
                claim.
              </p>
            </section>

            <section>
              <h2>10. Termination</h2>
              <p>
                We reserve the right to suspend or terminate your access to the
                Service at any time for violation of these terms or for any
                other reason at our discretion. You may terminate your account
                at any time by contacting support.
              </p>
            </section>

            <section>
              <h2>11. Changes to Terms</h2>
              <p>
                We may update these terms from time to time. We will notify you
                of material changes by posting the updated terms on the Service
                or by email. Continued use of the Service after changes
                constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2>12. Contact</h2>
              <p>
                For questions about these terms, please contact us at{' '}
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
          <a href="/privacy">Privacy</a>
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
