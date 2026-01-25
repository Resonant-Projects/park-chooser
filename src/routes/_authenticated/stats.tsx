import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { MapPin, TrendingUp, Loader2, Trophy } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/stats')({
  component: StatsPage,
})

function StatsPage() {
  const userParks = useQuery(api.userParks.getMyParksByVisits)

  // Calculate total visits
  const totalVisits = userParks?.reduce((sum: number, up: { visitCount: number }) => sum + up.visitCount, 0) ?? 0
  const parksWithVisits = userParks?.filter((up: { visitCount: number }) => up.visitCount > 0) ?? []

  // Find most visited park
  const mostVisited = parksWithVisits.length > 0 ? parksWithVisits[0] : null

  return (
    <main className="flex-1 flex flex-col items-stretch justify-start w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-cream)] mb-2">
          Visit Statistics
        </h1>
        <p className="text-[var(--color-mist)]">
          Track your park adventures
        </p>
      </div>

      {/* Summary - Vertical stack on mobile */}
      <div className="space-y-4 mb-8">
        <div className="stat-card">
          <TrendingUp className="w-10 h-10 text-[var(--color-gold)] mx-auto mb-3" />
          <p className="text-4xl font-bold text-[var(--color-cream)]">{totalVisits}</p>
          <p className="text-[var(--color-mist)] text-lg mt-1">Total Visits</p>
        </div>

        <div className="stat-card">
          <MapPin className="w-10 h-10 text-[var(--color-sage)] mx-auto mb-3" />
          <p className="text-4xl font-bold text-[var(--color-cream)]">
            {parksWithVisits.length}
          </p>
          <p className="text-[var(--color-mist)] text-lg mt-1">Parks Visited</p>
        </div>

        {mostVisited && (
          <div className="stat-card">
            <Trophy className="w-10 h-10 text-[var(--color-sunset)] mx-auto mb-3" />
            <p className="text-[var(--color-cream)] font-medium text-lg">
              {mostVisited.customName || mostVisited.park?.name}
            </p>
            <p className="text-[var(--color-gold)] font-bold text-2xl mt-1">
              {mostVisited.visitCount} visits
            </p>
            <p className="text-[var(--color-mist)] text-sm mt-1">Most Visited</p>
          </div>
        )}
      </div>

      {/* Parks List - Mobile-friendly cards instead of table */}
      <section>
        <h2 className="text-lg font-medium text-[var(--color-cream)] mb-4">
          All Parks by Visits
        </h2>

        {userParks === undefined ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-gold)]" />
          </div>
        ) : userParks.length === 0 ? (
          <div className="glass-card text-center py-8">
            <p className="text-[var(--color-mist)]">
              No parks in your list yet. Add some to start tracking visits!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {userParks.map((userPark, index) => (
              <div key={userPark._id} className="park-list-item">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center flex-shrink-0">
                      <span className="text-[var(--color-mist)] text-sm font-medium">
                        {index + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[var(--color-cream)] font-medium text-lg truncate">
                        {userPark.customName || userPark.park?.name}
                      </p>
                      {userPark.park?.address && (
                        <p className="text-[var(--color-mist)] text-sm truncate">
                          {userPark.park.address}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-2xl font-bold ${
                        userPark.visitCount > 0
                          ? 'text-[var(--color-gold)]'
                          : 'text-[var(--color-mist)]'
                      }`}
                    >
                      {userPark.visitCount}
                    </p>
                    <p className="text-[var(--color-mist)] text-xs">
                      visit{userPark.visitCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
