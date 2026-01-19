// Site configuration - single source of truth for branding and URLs
// Update these values when rebranding or changing domains

export const SITE_NAME = "Pick a Park";
export const SITE_URL = import.meta.env.SITE_URL || "https://pickapark.app";
export const SITE_DESCRIPTION =
  "Random park picker for families exploring local parks. Discover your next adventure.";
export const APP_SUBTITLE = "Random Park Picker for Families";

// Theme colors
export const THEME_COLOR = "#c9a227";
export const TILE_COLOR = "#1a472a";

// Derived values
export const DEFAULT_IMAGE_ALT = `${SITE_NAME} - ${APP_SUBTITLE}`;
