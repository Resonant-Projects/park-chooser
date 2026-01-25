import { ListPlus, Shuffle, Navigation2 } from 'lucide-react'

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
    title: 'Tap the Button',
    description: 'Let a little randomness inject fun into your routine.',
  },
  {
    number: 3,
    icon: Navigation2,
    title: 'Head Out',
    description: 'Get directions and go make memories.',
  },
]

export function HowItWorksSection() {
  return (
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
  )
}
