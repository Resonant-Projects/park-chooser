/**
 * Google Maps API helpers for fetching list items and place details.
 *
 * Uses the Places API (New) for Text Search and Place Details.
 */

const PLACES_API_BASE = "https://places.googleapis.com/v1/places";

export interface PlaceDetails {
  placeId: string;
  name: string;
  address?: string;
  photoRefs: string[];
}

export interface ParkEntry {
  name: string;
  searchQuery: string; // Name + location for Text Search
}

/**
 * SRQ Parks list from Google Maps.
 * These are Sarasota, FL area parks from the shared list.
 */
export const SRQ_PARKS: ParkEntry[] = [
  { name: "Locklear Park", searchQuery: "Locklear Park Sarasota FL" },
  { name: "Rothenbach Park", searchQuery: "Rothenbach Park Sarasota FL" },
  { name: "Waterside Park", searchQuery: "Waterside Park Sarasota FL" },
  { name: "Bayfront Park", searchQuery: "Bayfront Park Sarasota FL" },
  { name: "Avion Park", searchQuery: "Avion Park Sarasota FL" },
  { name: "Pompano Trailhead", searchQuery: "Pompano Trailhead Sarasota FL" },
  { name: "Laurel Park", searchQuery: "Laurel Park Sarasota FL" },
  { name: "Red Rock Park", searchQuery: "Red Rock Park Sarasota FL" },
  { name: "Pioneer Park", searchQuery: "Pioneer Park Sarasota FL" },
  { name: "Payne Park", searchQuery: "Payne Park Sarasota FL" },
  { name: "Ashton Trailhead", searchQuery: "Ashton Trailhead Sarasota FL" },
  {
    name: "Sarasota Springs Trailhead",
    searchQuery: "Sarasota Springs Trailhead Sarasota FL",
  },
  { name: "Twin Lakes Park", searchQuery: "Twin Lakes Park Sarasota FL" },
  { name: "Colonial Oaks Park", searchQuery: "Colonial Oaks Park Sarasota FL" },
  { name: "Potter Park", searchQuery: "Potter Park Sarasota FL" },
  {
    name: "Phillippi Estate Park",
    searchQuery: "Phillippi Estate Park Sarasota FL",
  },
  {
    name: "Arlington Recreational Park",
    searchQuery: "Arlington Recreational Park Sarasota FL",
  },
  { name: "Bee Ridge Park", searchQuery: "Bee Ridge Park Sarasota FL" },
  { name: "Kensington Park", searchQuery: "Kensington Park Sarasota FL" },
];

/**
 * Search for a place using Text Search API (New) and return the place ID.
 */
export async function searchPlace(query: string, apiKey: string): Promise<string | null> {
  const url = "https://places.googleapis.com/v1/places:searchText";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName",
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 1,
      }),
    });

    if (!response.ok) {
      console.error(`Text Search API error for "${query}": ${response.status}`);
      const errorText = await response.text();
      console.error("Error details:", errorText);
      return null;
    }

    const data = await response.json();

    if (data.places && data.places.length > 0) {
      return data.places[0].id;
    }

    console.warn(`No results found for "${query}"`);
    return null;
  } catch (error) {
    console.error(`Error searching for "${query}":`, error);
    return null;
  }
}

/**
 * Fetch place details from Google Places API (New)
 */
export async function fetchPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<PlaceDetails | null> {
  const url = `${PLACES_API_BASE}/${placeId}`;
  const fields = "id,displayName,formattedAddress,photos";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fields,
      },
    });

    if (!response.ok) {
      console.error(`Places API error for ${placeId}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    return {
      placeId: data.id || placeId,
      name: data.displayName?.text || "Unknown Park",
      address: data.formattedAddress,
      photoRefs: (data.photos || []).slice(0, 5).map((p: { name: string }) => p.name),
    };
  } catch (error) {
    console.error(`Error fetching place details for ${placeId}:`, error);
    return null;
  }
}

/**
 * Generate a photo URL from a Places API photo reference.
 * The photo name format from Places API (New) is: places/{placeId}/photos/{photoRef}
 *
 * IMPORTANT: Photo names expire! If images fail to load, the photoRef may be stale.
 * Use getFreshPhotoUrls() to fetch new refs when needed.
 */
export function getPhotoUrl(photoName: string, apiKey: string, maxWidth = 800): string {
  // Places API (New) photo media endpoint
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;
}

/**
 * Generate multiple photo URLs from photo references.
 * Returns up to `limit` URLs (default 5).
 */
export function getPhotoUrls(
  photoNames: string[],
  apiKey: string,
  maxWidth = 800,
  limit = 5
): string[] {
  return photoNames.slice(0, limit).map((name) => getPhotoUrl(name, apiKey, maxWidth));
}

/**
 * Fetch fresh photo references from Google Places API.
 * Use this when stored photoRefs may have expired (they expire after some time).
 *
 * @param placeId The Google Place ID
 * @param apiKey Google Maps API key
 * @param maxPhotos Maximum number of photos to return (default 10)
 * @returns Array of fresh photo reference names
 */
export async function getFreshPhotoRefs(
  placeId: string,
  apiKey: string,
  maxPhotos = 10
): Promise<string[]> {
  const url = `${PLACES_API_BASE}/${placeId}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "photos",
      },
    });

    if (!response.ok) {
      console.warn(`[Photo Refresh] Failed to fetch photos for ${placeId}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const photos = (data.photos || []).slice(0, maxPhotos);

    if (photos.length === 0) {
      console.warn(`[Photo Refresh] No photos available for place ${placeId}`);
    }

    return photos.map((p: { name: string }) => p.name);
  } catch (error) {
    console.error(`[Photo Refresh] Error fetching photos for ${placeId}:`, error);
    return [];
  }
}

/**
 * Fetch fresh photo URLs directly from Google Places API.
 * This is the recommended approach when displaying photos, as stored photoRefs expire.
 *
 * @param placeId The Google Place ID
 * @param apiKey Google Maps API key
 * @param maxWidth Maximum width in pixels (1-4800)
 * @param maxPhotos Maximum number of photos to return
 * @returns Array of photo URLs ready to display
 */
export async function getFreshPhotoUrls(
  placeId: string,
  apiKey: string,
  maxWidth = 800,
  maxPhotos = 5
): Promise<string[]> {
  const photoRefs = await getFreshPhotoRefs(placeId, apiKey, maxPhotos);
  return getPhotoUrls(photoRefs, apiKey, maxWidth, maxPhotos);
}

export interface FreshPhotosResult {
  photoUrl?: string;
  photoUrls: string[];
}

/**
 * Load fresh photos for a place with logging.
 * Consolidates the common pattern of fetching fresh photo refs and generating URLs.
 *
 * @param placeId The Google Place ID
 * @param parkName The park name for logging
 * @param apiKey Google Maps API key (or undefined to skip)
 * @param caller The calling function name for log context
 * @param maxWidth Maximum width in pixels (default 1200)
 * @param maxPhotos Maximum number of photos (default 5)
 * @returns Object with photoUrl (first photo) and photoUrls array
 */
export async function loadFreshPhotos(
  placeId: string,
  parkName: string,
  apiKey: string | undefined,
  caller: string,
  maxWidth = 1200,
  maxPhotos = 5
): Promise<FreshPhotosResult> {
  if (!apiKey) {
    console.error(`[${caller}] GOOGLE_MAPS_API_KEY not configured - photos will not load!`);
    return { photoUrls: [] };
  }

  console.log(`[${caller}] Fetching fresh photo refs for "${parkName}" (placeId: ${placeId})`);
  const freshPhotoRefs = await getFreshPhotoRefs(placeId, apiKey, maxPhotos * 2);

  if (freshPhotoRefs.length > 0) {
    const photoUrls = getPhotoUrls(freshPhotoRefs, apiKey, maxWidth, maxPhotos);
    console.log(`[${caller}] Generated ${photoUrls.length} photo URLs for "${parkName}"`);
    return {
      photoUrl: photoUrls[0],
      photoUrls,
    };
  }

  console.warn(`[${caller}] No photos available for park "${parkName}" (placeId: ${placeId})`);
  return { photoUrls: [] };
}

export interface TravelTimeResult {
  durationText: string; // e.g., "15 mins"
  distanceText: string; // e.g., "5.2 mi"
}

/**
 * Calculate driving time from origin coordinates to a destination place ID.
 * Uses Google Distance Matrix API.
 */
export async function getTravelTime(
  originLat: number,
  originLng: number,
  destinationPlaceId: string,
  apiKey: string
): Promise<TravelTimeResult | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", `${originLat},${originLng}`);
  url.searchParams.set("destinations", `place_id:${destinationPlaceId}`);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("units", "imperial");
  url.searchParams.set("key", apiKey);

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(`Distance Matrix API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.status !== "OK") {
      console.error(`Distance Matrix API status: ${data.status}`);
      return null;
    }

    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") {
      console.warn("No route found for destination");
      return null;
    }

    return {
      durationText: element.duration.text,
      distanceText: element.distance.text,
    };
  } catch (error) {
    console.error("Error fetching travel time:", error);
    return null;
  }
}

/**
 * Calculate driving distances from origin to multiple destinations in a single API call.
 * Uses Google Distance Matrix API with pipe-separated destinations (max 25 per call).
 *
 * @param originLat Origin latitude
 * @param originLng Origin longitude
 * @param destinationPlaceIds Array of Google Place IDs (max 25)
 * @param apiKey Google Maps API key
 * @returns Map of placeId to TravelTimeResult (null for failed lookups)
 */
export async function getTravelTimeBatch(
  originLat: number,
  originLng: number,
  destinationPlaceIds: string[],
  apiKey: string
): Promise<Map<string, TravelTimeResult | null>> {
  const results = new Map<string, TravelTimeResult | null>();

  if (destinationPlaceIds.length === 0) {
    return results;
  }

  // Distance Matrix API supports max 25 destinations per request
  if (destinationPlaceIds.length > 25) {
    console.warn("getTravelTimeBatch: Truncating to 25 destinations (API limit)");
  }
  const placeIds = destinationPlaceIds.slice(0, 25);

  // Build pipe-separated destinations string
  const destinations = placeIds.map((id) => `place_id:${id}`).join("|");

  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", `${originLat},${originLng}`);
  url.searchParams.set("destinations", destinations);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("units", "imperial");
  url.searchParams.set("key", apiKey);

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(`Distance Matrix API batch error: ${response.status}`);
      // Return null for all destinations on API error
      for (const placeId of placeIds) {
        results.set(placeId, null);
      }
      return results;
    }

    const data = await response.json();

    if (data.status !== "OK") {
      console.error(`Distance Matrix API batch status: ${data.status}`);
      for (const placeId of placeIds) {
        results.set(placeId, null);
      }
      return results;
    }

    // Process results - elements array corresponds to destinations array
    const elements = data.rows?.[0]?.elements || [];

    for (let i = 0; i < placeIds.length; i++) {
      const placeId = placeIds[i];
      const element = elements[i];

      if (element && element.status === "OK") {
        results.set(placeId, {
          durationText: element.duration.text,
          distanceText: element.distance.text,
        });
      } else {
        results.set(placeId, null);
      }
    }

    return results;
  } catch (error) {
    console.error("Error fetching batch travel times:", error);
    // Return null for all destinations on error
    for (const placeId of placeIds) {
      results.set(placeId, null);
    }
    return results;
  }
}

// ============================================================
// Nearby Search (Location Discovery)
// ============================================================

export interface NearbySearchResult {
  placeId: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  photoRefs: string[];
  primaryType?: string;
}

/**
 * Search for nearby parks using Places API Nearby Search (New).
 * Returns parks, playgrounds, and dog parks within the specified radius.
 */
export async function searchNearbyParks(
  lat: number,
  lng: number,
  radiusMeters: number,
  apiKey: string
): Promise<NearbySearchResult[]> {
  const url = "https://places.googleapis.com/v1/places:searchNearby";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.photos,places.primaryType",
      },
      body: JSON.stringify({
        includedPrimaryTypes: ["park", "playground", "dog_park"],
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        },
        maxResultCount: 20,
        rankPreference: "DISTANCE",
      }),
    });

    if (!response.ok) {
      console.error(`Nearby Search API error: ${response.status}`);
      const errorText = await response.text();
      console.error("Error details:", errorText);
      return [];
    }

    const data = await response.json();

    if (!data.places || data.places.length === 0) {
      console.log("No nearby parks found");
      return [];
    }

    return data.places
      .filter(
        (place: { id: string; location?: { latitude: number; longitude: number } }) =>
          place.location?.latitude !== undefined && place.location?.longitude !== undefined
      )
      .map(
        (place: {
          id: string;
          displayName?: { text: string };
          formattedAddress?: string;
          location: { latitude: number; longitude: number };
          photos?: Array<{ name: string }>;
          primaryType?: string;
        }) => ({
          placeId: place.id,
          name: place.displayName?.text || "Unknown Park",
          address: place.formattedAddress,
          lat: place.location.latitude,
          lng: place.location.longitude,
          photoRefs: (place.photos || []).slice(0, 5).map((p: { name: string }) => p.name),
          primaryType: place.primaryType,
        })
      );
  } catch (error) {
    console.error("Error searching nearby parks:", error);
    return [];
  }
}

/**
 * Calculate straight-line distance between two points using Haversine formula.
 * Returns distance in miles.
 */
export function calculateDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate a simple geohash for caching nearby search results.
 * Rounds coordinates to create geographic cache cells (~1 mile precision at default).
 */
export function simpleGeohash(lat: number, lng: number, precision: number = 2): string {
  const latRounded = lat.toFixed(precision);
  const lngRounded = lng.toFixed(precision);
  return `${latRounded},${lngRounded}`;
}
