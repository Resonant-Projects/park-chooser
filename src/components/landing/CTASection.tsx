import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

export function CTASection() {
  return (
    <>
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
          Ready for a little spontaneity?
        </h2>

        <Link
          to="/sign-up"
          className="btn btn-primary btn-lg"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '2rem',
          }}
        >
          Start Exploring Free
          <ArrowRight size={20} />
        </Link>

        <div
          className="glass-card"
          style={{
            maxWidth: '360px',
            margin: '0 auto',
            textAlign: 'left',
          }}
        >
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-mist)',
              marginBottom: '0.75rem',
              fontWeight: 500,
            }}
          >
            Free tier includes:
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: '1.25rem',
              color: 'var(--color-cream)',
              fontSize: '0.9375rem',
              lineHeight: 1.8,
              listStyle: 'disc',
            }}
          >
            <li>5 parks in your list</li>
            <li>1 random pick per day</li>
            <li>Track your visits</li>
          </ul>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-links">
          <Link to="/about">About</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/help">Help</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
      </footer>
    </>
  )
}
