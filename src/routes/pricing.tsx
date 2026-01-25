import { createFileRoute, Link } from '@tanstack/react-router'
import { PricingTable } from '@clerk/clerk-react'
import { useState } from 'react'
import { SEO, canonical } from '../lib/seo/config'

export const Route = createFileRoute('/pricing')({
  head: () => ({
    meta: [
      { title: `Pricing - ${SEO.siteName}` },
      { name: 'description', content: 'Simple pricing for families. Start free, upgrade when ready.' },
    ],
    links: [{ rel: 'canonical', href: canonical('/pricing') }],
  }),
  component: PricingPage,
})

const faqs = [
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor, Stripe.',
  },
  {
    question: 'Can I change my plan later?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.',
  },
  {
    question: 'Is there a free trial?',
    answer: "The Free plan is always available with no time limit. Try it out and upgrade whenever you're ready.",
  },
  {
    question: 'How do I cancel my subscription?',
    answer: "You can cancel anytime from your account settings. You'll keep premium features until the end of your billing period.",
  },
  {
    question: 'Do you offer refunds?',
    answer: "Yes, we offer a 30-day money-back guarantee. Contact us if you're not satisfied.",
  },
]

function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div className="pricing-page-container">
      {/* Compact Hero */}
      <header className="pricing-hero">
        <h1 className="pricing-hero-title">
          <span className="text-gradient">Pick Your Plan</span>
        </h1>
        <p className="pricing-hero-subtitle">
          Less planning, more playing
        </p>
      </header>

      {/* Clerk's PricingTable - directly embedded, no modal */}
      <section className="pricing-table-section">
        <PricingTable />
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <h2 className="section-header">Frequently Asked Questions</h2>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <FaqItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openFaq === index}
              onClick={() => setOpenFaq(openFaq === index ? null : index)}
            />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <nav className="landing-footer-links">
          <Link to="/">Home</Link>
          <a href="/about">About</a>
          <a href="/help">Help</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </nav>
      </footer>
    </div>
  )
}

function FaqItem({ question, answer, isOpen, onClick }: {
  question: string
  answer: string
  isOpen: boolean
  onClick: () => void
}) {
  return (
    <div className="faq-item">
      <button className="faq-question" onClick={onClick}>
        {question}
        <span className="faq-toggle">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && <p className="faq-answer">{answer}</p>}
    </div>
  )
}

export default PricingPage
