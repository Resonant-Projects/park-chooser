/**
 * Shared geolocation utility with caching and consistent error handling
 */

export interface CachedLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

export type LocationError = "denied" | "timeout" | "unavailable" | "unsupported";

export type LocationResult =
  | { success: true; lat: number; lng: number }
  | { success: false; error: LocationError };

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes
let cachedLocation: CachedLocation | null = null;

/**
 * Maps GeolocationPositionError codes to our error types
 */
function mapGeolocationError(error: GeolocationPositionError): LocationError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "denied";
    case error.TIMEOUT:
      return "timeout";
    case error.POSITION_UNAVAILABLE:
    default:
      return "unavailable";
  }
}

/**
 * Get the user's current location with caching
 * @param options.forceRefresh - Bypass cache and request fresh location
 * @param options.timeout - Timeout in milliseconds (default: 10000)
 */
export async function getLocation(options?: {
  forceRefresh?: boolean;
  timeout?: number;
}): Promise<LocationResult> {
  // Check cache first (unless force refresh)
  if (
    !options?.forceRefresh &&
    cachedLocation &&
    Date.now() - cachedLocation.timestamp < CACHE_TTL
  ) {
    return { success: true, lat: cachedLocation.lat, lng: cachedLocation.lng };
  }

  // Check if geolocation is supported
  if (!("geolocation" in navigator)) {
    return { success: false, error: "unsupported" };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Update cache
        cachedLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now(),
        };
        resolve({ success: true, lat: cachedLocation.lat, lng: cachedLocation.lng });
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
        resolve({ success: false, error: mapGeolocationError(error) });
      },
      {
        enableHighAccuracy: false,
        timeout: options?.timeout ?? 10000,
        maximumAge: 60000, // Accept position up to 1 minute old from browser
      }
    );
  });
}

/**
 * Get a user-friendly error message for a location error
 */
export function getLocationErrorMessage(error: LocationError): string {
  switch (error) {
    case "denied":
      return "Location access denied";
    case "timeout":
      return "Location request timed out";
    case "unavailable":
      return "Location unavailable";
    case "unsupported":
      return "Geolocation not supported";
  }
}

/**
 * Clear the location cache (useful for testing or when user wants fresh data)
 */
export function clearLocationCache(): void {
  cachedLocation = null;
}
