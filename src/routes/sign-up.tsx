import { createFileRoute } from '@tanstack/react-router'
import { SignUp } from '@clerk/clerk-react'

export const Route = createFileRoute('/sign-up')({
  head: () => ({
    meta: [
      { title: 'Sign Up - Pick A Park' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: SignUpPage,
})

function SignUpPage() {
  return (
    <div className="container">
      <main className="flex flex-col items-center justify-center py-8">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/app"
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-[rgba(255,255,255,0.1)] backdrop-blur-lg border border-[rgba(255,255,255,0.1)]',
              headerTitle: 'text-[var(--color-cream)]',
              headerSubtitle: 'text-[var(--color-mist)]',
              socialButtonsBlockButton:
                'bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.2)] text-[var(--color-cream)] hover:bg-[rgba(255,255,255,0.15)]',
              formFieldLabel: 'text-[var(--color-mist)]',
              formFieldInput:
                'bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.2)] text-[var(--color-cream)]',
              formButtonPrimary:
                'bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-sunset)]',
              footerActionLink:
                'text-[var(--color-gold)] hover:text-[var(--color-sunset)]',
            },
          }}
        />
      </main>
    </div>
  )
}
