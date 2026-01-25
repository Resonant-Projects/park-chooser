import { Leaf, TreePine } from 'lucide-react'

const particles = [
  { Icon: Leaf, left: '5%', size: 16, duration: 22, delay: 0 },
  { Icon: TreePine, left: '15%', size: 20, duration: 28, delay: 5 },
  { Icon: Leaf, left: '25%', size: 14, duration: 20, delay: 2 },
  { Icon: TreePine, left: '40%', size: 18, duration: 25, delay: 8 },
  { Icon: Leaf, left: '55%', size: 12, duration: 24, delay: 12 },
  { Icon: TreePine, left: '65%', size: 22, duration: 30, delay: 3 },
  { Icon: Leaf, left: '75%', size: 15, duration: 21, delay: 7 },
  { Icon: TreePine, left: '85%', size: 17, duration: 26, delay: 10 },
  { Icon: Leaf, left: '92%', size: 13, duration: 23, delay: 15 },
]

export function FloatingParticles() {
  return (
    <div className="particles-container" aria-hidden="true">
      {particles.map((particle, index) => {
        const { Icon, left, size, duration, delay } = particle
        return (
          <div
            key={index}
            className="floating-particle"
            style={{
              left,
              '--duration': `${duration}s`,
              '--delay': `${delay}s`,
            } as React.CSSProperties}
          >
            <Icon size={size} />
          </div>
        )
      })}
    </div>
  )
}
