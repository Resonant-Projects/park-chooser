import { createFileRoute, Link } from '@tanstack/react-router'
import { SEO, canonical } from '../../lib/seo/config'
import {
  HelpCircle,
  Compass,
  TreePine,
  BarChart3,
  Wallet,
  ChevronRight,
  MessageSquare,
  Star,
} from 'lucide-react'
import { FloatingParticles } from '../../components/landing'
import { useState } from 'react'

export const Route = createFileRoute('/help/')({
  head: () => ({
    meta: [
      { title: `Help Center - ${SEO.siteName}` },
      {
        name: 'description',
        content: `Get help with ${SEO.siteName}. Find answers to FAQs about adding parks, tracking visits, subscriptions, and more.`,
      },
      { property: 'og:title', content: `Help Center - ${SEO.siteName}` },
      {
        property: 'og:description',
        content: `Get help with ${SEO.siteName}. Find answers to FAQs about adding parks, tracking visits, subscriptions, and more.`,
      },
      { property: 'og:url', content: canonical('/help') },
    ],
    links: [{ rel: 'canonical', href: canonical('/help') }],
  }),
  component: HelpPage,
})

const quickLinks = [
  {
    icon: Compass,
    title: 'Getting Started',
    description: 'Learn the basics',
    href: '/about',
  },
  {
    icon: TreePine,
    title: 'Managing Parks',
    description: 'Add and organize parks',
    href: '/manage',
  },
  {
    icon: BarChart3,
    title: 'Stats & History',
    description: 'Track your visits',
    href: '/stats',
  },
  {
    icon: Wallet,
    title: 'Account & Billing',
    description: 'Subscription settings',
    href: '/pricing',
  },
]

const faqs = [
  {
    question: 'How do I add parks to my list?',
    answer:
      'You can add parks in two ways: use the Discover feature to find nearby parks automatically, or manually add parks by name and location from the Manage page. Each park you add will be available for random selection.',
  },
  {
    question: "Why doesn't the same park repeat?",
    answer:
      "Pick a Park uses smart selection to ensure variety in your park visits. Once you've visited all parks in your list, the cycle resets so you can explore them all again. This helps you discover and revisit all your favorite spots.",
  },
  {
    question: 'How is travel time calculated?',
    answer:
      'Travel time is calculated using your current location (with your permission) and real-time traffic data. The estimate shows driving time under current conditions and updates when you pick a new park.',
  },
  {
    question: 'How do I track my park visits?',
    answer:
      'When you visit a park, tap the "Mark as Visited" button to log your visit. You can view your visit history and statistics on the Stats page, including total visits, streak information, and your most-visited parks.',
  },
  {
    question: 'Can I change or cancel my subscription?',
    answer:
      'Yes! You can manage your subscription at any time from your account settings. Click on your profile icon and select "Manage Subscription" to upgrade, downgrade, or cancel. Changes take effect at the end of your current billing period.',
  },
  {
    question: 'What happens to my parks if I cancel?',
    answer:
      'Your parks and visit history are never deleted. If you cancel a paid subscription, you\'ll retain access to the free tier features and your first 5 parks. You can always resubscribe to regain access to your full park list.',
  },
]

function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="landing-container">
      <FloatingParticles />

      {/* Hero Section */}
      <section className="help-hero">
        <div className="help-hero-icon">
          <HelpCircle size={48} />
        </div>
        <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
          <span className="text-gradient">Help Center</span>
        </h1>
        <p className="subtitle" style={{ maxWidth: '400px', animationDelay: '0.3s' }}>
          Find answers and get support
        </p>
      </section>

      {/* Quick Links Grid */}
      <section className="landing-section">
        <h2 className="section-header">Quick Links</h2>
        <div className="trail-markers-grid">
          {quickLinks.map((link, index) => {
            const Icon = link.icon
            return (
              <Link
                key={index}
                to={link.href}
                className="trail-marker"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="trail-marker-icon">
                  <Icon size={40} />
                </div>
                <h3 className="trail-marker-title">{link.title}</h3>
                <p className="trail-marker-desc">{link.description}</p>
              </Link>
            )
          })}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="landing-section">
        <h2 className="section-header">Frequently Asked Questions</h2>
        <div className="glass-card-accent whisper-container">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="whisper-item"
              data-open={openIndex === index}
            >
              <button
                className="whisper-question"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                aria-expanded={openIndex === index}
              >
                <ChevronRight className="whisper-chevron" size={18} />
                <span>{faq.question}</span>
              </button>
              <div className="whisper-answer">
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Support CTAs */}
      <section className="landing-section support-cta-section">
        <h2 className="section-header">Need More Help?</h2>
        <div className="support-cta-grid">
          <Link to="/help/contact" className="support-cta-card">
            <MessageSquare size={32} className="support-cta-icon" />
            <h3>Contact Support</h3>
            <p>Get help from our team</p>
          </Link>
          <Link to="/help/feedback" className="support-cta-card">
            <Star size={32} className="support-cta-icon" />
            <h3>Send Feedback</h3>
            <p>Help us improve</p>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-links">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/pricing">Pricing</a>
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
