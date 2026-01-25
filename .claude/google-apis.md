# Google APIs Integration

Google Places API (New) and Distance Matrix API integration. All helpers in `convex/lib/googleMaps.ts`.

## APIs Used

| API                              | Purpose                        | Endpoint                            |
| -------------------------------- | ------------------------------ | ----------------------------------- |
| Places API (New) - Text Search   | Find place ID by query         | `POST /v1/places:searchText`        |
| Places API (New) - Details       | Get address, photos            | `GET /v1/places/{placeId}`          |
| Places API (New) - Nearby Search | Discover parks by location     | `POST /v1/places:searchNearby`      |
| Places API (New) - Photos        | Get place photos               | `GET /v1/{photoName}/media`         |
| Distance Matrix API              | Calculate travel time/distance | `GET /maps/api/distancematrix/json` |

## Authentication

All requests require `X-Goog-Api-Key` header (Places API) or `key` query param (Distance Matrix).

```typescript
// Places API (New)
headers: {
  "X-Goog-Api-Key": apiKey,
  "X-Goog-FieldMask": "places.id,places.displayName,places.photos"
}

// Distance Matrix
url.searchParams.set("key", apiKey);
```

**Environment variable:** `GOOGLE_MAPS_API_KEY` (set in Convex Dashboard)

## Photo Handling (Critical)

**Photo references expire!** Never store URLs permanently.

```typescript
// WRONG: Store photoRefs and generate URLs later
const photoUrl = getPhotoUrl(park.photoRefs[0], apiKey); // May fail if refs expired

// CORRECT: Always fetch fresh refs before displaying
const photos = await loadFreshPhotos(placeId, parkName, apiKey, "pickPark");
return { photoUrl: photos.photoUrl, photoUrls: photos.photoUrls };
```

### Photo URL Format

```
https://places.googleapis.com/v1/{photoName}/media?maxWidthPx={width}&key={apiKey}
```

Where `photoName` is the full resource name: `places/{placeId}/photos/{photoRef}`

### Helper Functions

```typescript
// Get fresh photo refs from API
getFreshPhotoRefs(placeId, apiKey, maxPhotos = 10): Promise<string[]>

// Generate URLs from refs
getPhotoUrls(photoNames, apiKey, maxWidth = 800, limit = 5): string[]

// All-in-one: fetch refs + generate URLs with logging
loadFreshPhotos(placeId, parkName, apiKey, caller): Promise<{photoUrl?, photoUrls[]}>
```

## Text Search

Find a place ID by name/location query.

```typescript
const placeId = await searchPlace("Payne Park Sarasota FL", apiKey);
// Returns: "ChIJ..." or null
```

**Field mask:** `places.id,places.displayName`

## Place Details

Get address and photos for a place.

```typescript
const details = await fetchPlaceDetails(placeId, apiKey);
// Returns: { placeId, name, address?, photoRefs[] }
```

**Field mask:** `id,displayName,formattedAddress,photos`

## Nearby Search

Discover parks within a radius.

```typescript
const parks = await searchNearbyParks(lat, lng, radiusMeters, apiKey);
// Returns: Array<{ placeId, name, address?, lat, lng, photoRefs[], primaryType? }>
```

**Included types:** `park`, `playground`, `dog_park`
**Max results:** 20
**Rank preference:** `DISTANCE`

## Distance Matrix

Calculate driving time and distance.

```typescript
// Single destination
const result = await getTravelTime(originLat, originLng, placeId, apiKey);
// Returns: { durationText: "15 mins", distanceText: "5.2 mi" }

// Batch (up to 25 destinations)
const results = await getTravelTimeBatch(originLat, originLng, placeIds, apiKey);
// Returns: Map<placeId, { durationText, distanceText } | null>
```

**Mode:** `driving`
**Units:** `imperial` (miles, minutes)

## Utility Functions

```typescript
// Straight-line distance (Haversine formula)
const miles = calculateDistanceMiles(lat1, lng1, lat2, lng2);

// Simple geohash for caching nearby results
const hash = simpleGeohash(lat, lng, (precision = 2)); // "27.34,-82.54"
```

## SRQ_PARKS Seed Data

Default parks for new users. Defined in `convex/lib/googleMaps.ts`:

```typescript
export const SRQ_PARKS: ParkEntry[] = [
  { name: "Locklear Park", searchQuery: "Locklear Park Sarasota FL" },
  { name: "Payne Park", searchQuery: "Payne Park Sarasota FL" },
  // ... 19 total parks
];
```

### Adding a New Default Park

1. Add entry to `SRQ_PARKS` array
2. Run sync: `npx convex run actions/syncParks:syncParks --args '{"force": true}'`
3. Verify in Convex Dashboard → parks table

## Rate Limiting

- Sync action uses 200ms delays between API calls
- Distance Matrix batch: max 25 destinations per request
- Nearby Search: max 20 results per request

## Common Patterns

### In pickPark action

```typescript
// Always fetch fresh photos (refs expire)
const photos = await loadFreshPhotos(selectedPark.placeId, selectedPark.name, apiKey, "pickPark");

return {
  photoUrl: photos.photoUrl,
  photoUrls: photos.photoUrls.length > 0 ? photos.photoUrls : undefined,
  // ...
};
```

### In syncParks action

```typescript
for (const park of SRQ_PARKS) {
  const placeId = await searchPlace(park.searchQuery, apiKey);
  if (placeId) {
    const details = await fetchPlaceDetails(placeId, apiKey);
    // Upsert to database
  }
  await new Promise((r) => setTimeout(r, 200)); // Rate limit
}
```
