import { useState, useCallback, useRef, useEffect } from 'react'

interface LocationResult {
  lat: number
  lng: number
}

type LocationErrorType = 'denied' | 'timeout' | 'unavailable' | 'unsupported'

interface LocationError {
  type: LocationErrorType
  message: string
}

interface UseLocationReturn {
  location: LocationResult | null
  error: LocationError | null
  isLoading: boolean
  requestLocation: (forceRefresh?: boolean) => void
}

// Cache TTL in milliseconds (2 minutes)
const CACHE_TTL = 2 * 60 * 1000

interface CachedLocation {
  location: LocationResult
  timestamp: number
}

// Module-level cache to persist across component remounts
let cachedLocation: CachedLocation | null = null

function getErrorMessage(type: LocationErrorType): string {
  switch (type) {
    case 'denied':
      return 'Location access denied. Please enable location in your browser settings.'
    case 'timeout':
      return 'Location request timed out. Please try again.'
    case 'unavailable':
      return 'Unable to determine your location. Please try again.'
    case 'unsupported':
      return 'Geolocation is not supported by your browser.'
  }
}

function mapGeolocationError(error: GeolocationPositionError): LocationErrorType {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'denied'
    case error.TIMEOUT:
      return 'timeout'
    case error.POSITION_UNAVAILABLE:
      return 'unavailable'
    default:
      return 'unavailable'
  }
}

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationResult | null>(() => {
    // Initialize from cache if valid
    if (cachedLocation && Date.now() - cachedLocation.timestamp < CACHE_TTL) {
      return cachedLocation.location
    }
    return null
  })
  const [error, setError] = useState<LocationError | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const requestInProgress = useRef(false)
  const isMounted = useRef(true)

  const requestLocation = useCallback((forceRefresh = false) => {
    // Check if a request is already in progress
    if (requestInProgress.current) {
      return
    }

    // Check cache unless force refresh
    if (!forceRefresh && cachedLocation && Date.now() - cachedLocation.timestamp < CACHE_TTL) {
      setLocation(cachedLocation.location)
      setError(null)
      return
    }

    // Check browser support
    if (!navigator.geolocation) {
      const errorType: LocationErrorType = 'unsupported'
      setError({
        type: errorType,
        message: getErrorMessage(errorType),
      })
      return
    }

    requestInProgress.current = true
    setIsLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Prevent state updates after unmount
        if (!isMounted.current) return

        const newLocation: LocationResult = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        // Update cache
        cachedLocation = {
          location: newLocation,
          timestamp: Date.now(),
        }

        setLocation(newLocation)
        setIsLoading(false)
        requestInProgress.current = false
      },
      (geoError) => {
        // Prevent state updates after unmount
        if (!isMounted.current) return

        const errorType = mapGeolocationError(geoError)
        setError({
          type: errorType,
          message: getErrorMessage(errorType),
        })
        setIsLoading(false)
        requestInProgress.current = false
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: forceRefresh ? 0 : CACHE_TTL,
      }
    )
  }, [])

  // Clean up on unmount
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      requestInProgress.current = false
    }
  }, [])

  return {
    location,
    error,
    isLoading,
    requestLocation,
  }
}
