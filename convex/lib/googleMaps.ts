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
export async function searchPlace(
  query: string,
  apiKey: string
): Promise<string | null> {
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
      photoRefs: (data.photos || [])
        .slice(0, 5)
        .map((p: { name: string }) => p.name),
    };
  } catch (error) {
    console.error(`Error fetching place details for ${placeId}:`, error);
    return null;
  }
}

/**
 * Generate a photo URL from a Places API photo reference.
 * The photo name format from Places API (New) is: places/{placeId}/photos/{photoRef}
 */
export function getPhotoUrl(
  photoName: string,
  apiKey: string,
  maxWidth = 800
): string {
  // Places API (New) photo media endpoint
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;
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
  const url = new URL(
    "https://maps.googleapis.com/maps/api/distancematrix/json"
  );
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
        (place: {
          id: string;
          location?: { latitude: number; longitude: number };
        }) =>
          place.location?.latitude !== undefined &&
          place.location?.longitude !== undefined
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
          photoRefs: (place.photos || [])
            .slice(0, 5)
            .map((p: { name: string }) => p.name),
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
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate a simple geohash for caching nearby search results.
 * Rounds coordinates to create geographic cache cells (~1 mile precision at default).
 */
export function simpleGeohash(
  lat: number,
  lng: number,
  precision: number = 2
): string {
  const latRounded = lat.toFixed(precision);
  const lngRounded = lng.toFixed(precision);
  return `${latRounded},${lngRounded}`;
}
