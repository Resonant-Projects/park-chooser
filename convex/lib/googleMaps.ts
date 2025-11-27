/**
 * Google Maps API helpers for fetching list items and place details.
 *
 * Note: The Google Maps Data API for lists is not publicly available.
 * Instead, we use a workaround: scrape the shared list page or manually
 * seed parks. For production, you'd integrate with the Places API for
 * place details and photos.
 */

const PLACES_API_BASE = "https://places.googleapis.com/v1/places";

export interface PlaceDetails {
  placeId: string;
  name: string;
  address?: string;
  photoRefs: string[];
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

/**
 * Hardcoded park place IDs from the Google Maps list.
 * In a real scenario, you would either:
 * 1. Use the Maps Data API (if available)
 * 2. Scrape the shared list page
 * 3. Manually maintain this list
 *
 * These are example Seattle-area parks - replace with actual place IDs from your list.
 */
export const PARK_PLACE_IDS = [
  "ChIJBYpG4FcVkFQRMKMj6aGu6HQ", // Discovery Park
  "ChIJVTPokywQkFQRmtVoG6H_u6Y", // Gas Works Park
  "ChIJ7cv00DwVkFQROiNRpUq2UGs", // Golden Gardens Park
  "ChIJc-wLChYUkFQRHUhQ9p3fqbA", // Volunteer Park
  "ChIJAx7UL8IVkFQR86Iqc-fUncc", // Carkeek Park
  "ChIJvz-Jz4oUkFQRj6t0XHGB2oo", // Cal Anderson Park
  "ChIJzQMx6vBBkFQR0iFQoAi7Hxk", // Seward Park
  "ChIJtRkkqIJqkFQRLsOKQroRdQQ", // Marymoor Park
  "ChIJyWEHuEmuEmsRm9hTkapTCrk", // Green Lake Park
  "ChIJN1t_tDeuEmsRUsoyG83frY4", // Kerry Park
];

