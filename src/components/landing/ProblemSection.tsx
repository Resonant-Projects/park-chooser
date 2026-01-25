import { MessageCircle, MapPin, Clock } from 'lucide-react'

const problems = [
  {
    icon: MessageCircle,
    title: 'The Endless Debate',
    description:
      "Everyone has an opinion, but nobody can agree on which park to visit this weekend.",
  },
  {
    icon: MapPin,
    title: 'The Same Old Spots',
    description:
      "You keep going to the same three parks because deciding is just... exhausting.",
  },
  {
    icon: Clock,
    title: 'The Wasted Morning',
    description:
      'By the time you finally pick a park, half the day is gone.',
  },
]

export function ProblemSection() {
  return (
    <section className="landing-section-wide">
      <h2 className="section-header">Sound familiar?</h2>

      <div className="landing-grid-3">
        {problems.map((problem, index) => {
          const Icon = problem.icon
          return (
            <div
              key={index}
              className={`glass-card-accent animate-slide-up delay-${(index + 1) * 100}`}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                }}
              >
                <Icon
                  size={24}
                  style={{ color: 'var(--color-gold)', flexShrink: 0 }}
                />
                <h3
                  style={{
                    fontFamily: '"Fraunces", Georgia, serif',
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--color-cream)',
                    margin: 0,
                  }}
                >
                  {problem.title}
                </h3>
              </div>
              <p
                style={{
                  color: 'var(--color-mist)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {problem.description}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
