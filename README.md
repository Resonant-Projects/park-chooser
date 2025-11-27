# Park Chooser 🌲

A simple Astro website that randomly picks a park from your curated list. Each visit shows a different park, with no repeats within the last 5 picks.

## Features

- **Random Park Selection**: Every page load picks a random park
- **No Recent Repeats**: Parks won't repeat within the last 5 selections
- **Google Places Integration**: Fetches park photos and details from Google Places API
- **Convex Backend**: Real-time database for tracking picks and park data
- **Beautiful UI**: Nature-inspired design with smooth animations

## Prerequisites

- [Bun](https://bun.sh/) (or Node.js 18+)
- A [Google Cloud](https://console.cloud.google.com/) account with billing enabled
- A [Convex](https://convex.dev/) account

## Setup

### 1. Install Dependencies

```sh
bun install
```

### 2. Configure Google Cloud

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the following APIs:
   - **Places API (New)** - for fetching park details and photos
4. Create an API key:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - (Optional) Restrict the key to your domains and the Places API

### 3. Configure Convex

The Convex project is already initialized. To connect to it:

```sh
npx convex dev
```

This will:
- Start the Convex development server
- Sync your schema and functions
- Create a `.env.local` file with your deployment URL

### 4. Set Environment Variables

Add your Google Maps API key to `.env.local`:

```sh
# Add this line to .env.local (created by Convex)
GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 5. Customize the Park List

Edit the `PARK_PLACE_IDS` array in `convex/lib/googleMaps.ts` with the Google Place IDs for your parks.

To find Place IDs:
1. Go to [Place ID Finder](https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder)
2. Search for each park
3. Copy the Place ID

### 6. Sync Parks

The first time you visit the site, it will automatically sync parks from the Google Places API. You can also trigger a manual sync:

```sh
npx convex run actions/syncParks:syncParks --args '{"force": true}'
```

## Development

Run the Astro dev server and Convex in parallel:

```sh
# Terminal 1: Start Convex
npx convex dev

# Terminal 2: Start Astro
bun dev
```

Visit [http://localhost:4321](http://localhost:4321) to see the app.

## How It Works

1. **On page load**: The Astro server calls the `pickPark` Convex action
2. **Park selection**: The action queries all parks, filters out the last 5 picks, and randomly selects one
3. **Recording**: The selection is saved to the `picks` table with a timestamp
4. **Display**: The park name, address, and photo are rendered on the page
5. **Pick Again**: Clicking the button calls the action client-side without a full reload

## Project Structure

```
/
├── convex/
│   ├── actions/
│   │   ├── pickPark.ts     # Random park selection action
│   │   └── syncParks.ts    # Google Places sync action
│   ├── lib/
│   │   └── googleMaps.ts   # Google API helpers & park list
│   ├── parks.ts            # Park queries and mutations
│   ├── picks.ts            # Pick history queries
│   └── schema.ts           # Database schema
├── src/
│   ├── lib/
│   │   └── convexClient.ts # HTTP client for Convex
│   ├── pages/
│   │   └── index.astro     # Main page
│   └── styles/
│       └── global.css      # Styling
└── package.json
```

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `bun install`     | Install dependencies                        |
| `bun dev`         | Start Astro dev server at `localhost:4321`  |
| `npx convex dev`  | Start Convex dev server                     |
| `bun build`       | Build production site to `./dist/`          |
| `bun preview`     | Preview production build locally            |

## Verifying the 5-Pick Constraint

To verify parks don't repeat within 5 picks:

1. Open the [Convex Dashboard](https://dashboard.convex.dev/)
2. Navigate to your project → Data → `picks` table
3. Observe the `parkId` values - no ID should appear more than once in any consecutive 5 entries

Or query recent picks:

```sh
npx convex run picks:getRecentPicks --args '{"limit": 10}'
```

## License

MIT
