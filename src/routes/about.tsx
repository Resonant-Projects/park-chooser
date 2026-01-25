import { createFileRoute } from '@tanstack/react-router'
import { SEO, canonical } from '../lib/seo/config'
import {
  Trees,
  TreePine,
  TreeDeciduous,
  ListPlus,
  Shuffle,
  Navigation2,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { FloatingParticles } from '../components/landing'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [
      { title: `About - ${SEO.siteName}` },
      {
        name: 'description',
        content:
          'Learn about Pick a Park - a simple tool helping families get outside more often. Part of the Resonant Projects collection.',
      },
      { property: 'og:title', content: `About - ${SEO.siteName}` },
      {
        property: 'og:description',
        content:
          'Learn about Pick a Park - a simple tool helping families get outside more often.',
      },
      { property: 'og:url', content: canonical('/about') },
    ],
    links: [{ rel: 'canonical', href: canonical('/about') }],
  }),
  component: AboutPage,
})

const steps = [
  {
    number: 1,
    icon: ListPlus,
    title: 'Build Your List',
    description: 'Add your favorite parks or discover new ones nearby.',
  },
  {
    number: 2,
    icon: Shuffle,
    title: 'Pick a Park',
    description: 'Let a little randomness inject fun into your routine.',
  },
  {
    number: 3,
    icon: Navigation2,
    title: 'Go Explore',
    description: 'Get directions and go make memories.',
  },
]

function AboutPage() {
  return (
    <div className="landing-container">
      <FloatingParticles />

      {/* Hero Section */}
      <section className="landing-hero" style={{ minHeight: '50vh' }}>
        <div className="icon-cluster">
          <TreePine size={36} style={{ marginBottom: '4px' }} />
          <Trees size={56} />
          <TreeDeciduous size={40} style={{ marginBottom: '2px' }} />
        </div>

        <h1
          className="title"
          style={{ fontSize: '2.5rem', marginBottom: '1rem' }}
        >
          <span className="text-gradient">About Pick a Park</span>
        </h1>

        <p
          className="subtitle"
          style={{
            maxWidth: '480px',
            fontSize: '1.125rem',
            lineHeight: 1.6,
          }}
        >
          Making every day an adventure
        </p>
      </section>

      {/* Mission Section */}
      <section className="landing-section">
        <div className="glass-card-accent">
          <h2
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--color-cream)',
              marginTop: 0,
              marginBottom: '1rem',
            }}
          >
            Our Mission
          </h2>
          <p
            style={{
              color: 'var(--color-mist)',
              fontSize: '1rem',
              lineHeight: 1.7,
              margin: '0 0 1rem',
            }}
          >
            Pick a Park is a simple tool that helps families get outside more
            often. Instead of debating which park to visit or defaulting to the
            same spot every time, let us pick for you.
          </p>
          <p
            style={{
              color: 'var(--color-mist)',
              fontSize: '1rem',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Add your favorite local parks to your list, hit the button, and
            discover where your next adventure awaits. Track your visits and
            make sure you're exploring all your neighborhood has to offer.
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="landing-section-wide">
        <h2 className="section-header">How It Works</h2>

        <div className="landing-grid-3">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div
                key={index}
                className={`animate-slide-up delay-${(index + 1) * 100}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '1rem',
                }}
              >
                <div className="step-badge" style={{ marginBottom: '1rem' }}>
                  {step.number}
                </div>
                <Icon
                  size={32}
                  style={{
                    color: 'var(--color-sage)',
                    marginBottom: '0.75rem',
                  }}
                />
                <h3
                  style={{
                    fontFamily: '"Fraunces", Georgia, serif',
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--color-cream)',
                    margin: '0 0 0.5rem',
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    color: 'var(--color-mist)',
                    fontSize: '0.9375rem',
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {step.description}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Resonant Projects Section */}
      <section className="landing-section">
        <div
          className="glass-card-accent"
          style={{
            background:
              'linear-gradient(135deg, rgba(212, 168, 75, 0.08) 0%, rgba(255, 255, 255, 0.08) 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <Sparkles
              size={24}
              style={{ color: 'var(--color-gold)', flexShrink: 0 }}
            />
            <h2
              style={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'var(--color-cream)',
                margin: 0,
              }}
            >
              Part of Resonant Projects
            </h2>
          </div>
          <p
            style={{
              color: 'var(--color-mist)',
              fontSize: '1rem',
              lineHeight: 1.7,
              margin: '0 0 1.25rem',
            }}
          >
            Pick a Park is crafted by{' '}
            <a
              href="https://resonantprojects.art"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--color-gold)',
                fontWeight: 500,
              }}
            >
              Resonant Projects
            </a>{' '}
            — a collection of thoughtfully designed tools and creative works at
            the intersection of technology, art, and everyday life.
          </p>
          <p
            style={{
              color: 'var(--color-mist)',
              fontSize: '1rem',
              lineHeight: 1.7,
              margin: '0 0 1.5rem',
            }}
          >
            We believe in building things that bring a little more joy and
            spontaneity into the world.
          </p>
          <a
            href="https://resonantprojects.art"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--color-gold)',
              fontWeight: 500,
              fontSize: '0.9375rem',
            }}
          >
            Explore Resonant Projects
            <ExternalLink size={16} />
          </a>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-section" style={{ textAlign: 'center' }}>
        <h2
          style={{
            fontFamily: '"Fraunces", Georgia, serif',
            fontSize: '2rem',
            fontWeight: 600,
            color: 'var(--color-cream)',
            marginBottom: '1.5rem',
          }}
        >
          Ready to start exploring?
        </h2>

        <a
          href="/sign-up"
          className="btn btn-primary btn-lg"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          Get Started Free
          <ArrowRight size={20} />
        </a>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-links">
          <a href="/">Home</a>
          <a href="/pricing">Pricing</a>
          <a href="/help">Help</a>
          <a href="/terms">Terms</a>
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
