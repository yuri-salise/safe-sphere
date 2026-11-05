const DEFAULT_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_LAT = 7.8582;
const DEFAULT_LNG = 125.0499;
const DEFAULT_ZOOM = 14;

function resolveMapStyleUrl() {
  const configured = process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim();

  if (!configured) return DEFAULT_MAP_STYLE_URL;

  try {
    const url = new URL(configured);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return configured;
    }
  } catch {
    // Invalid public configuration falls back to the built-in style.
  }

  return DEFAULT_MAP_STYLE_URL;
}

function resolveCoordinates(): [number, number] {
  const lngStr = process.env.NEXT_PUBLIC_MAP_DEFAULT_LNG?.trim();
  const latStr = process.env.NEXT_PUBLIC_MAP_DEFAULT_LAT?.trim();
  const lng = lngStr ? parseFloat(lngStr) : DEFAULT_LNG;
  const lat = latStr ? parseFloat(latStr) : DEFAULT_LAT;

  return [isNaN(lng) ? DEFAULT_LNG : lng, isNaN(lat) ? DEFAULT_LAT : lat];
}

function resolveZoom(): number {
  const zoomStr = process.env.NEXT_PUBLIC_MAP_DEFAULT_ZOOM?.trim();
  const zoom = zoomStr ? parseFloat(zoomStr) : DEFAULT_ZOOM;
  return isNaN(zoom) ? DEFAULT_ZOOM : zoom;
}

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Safe Sphere",
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION?.trim() ||
    "Real-Time Disaster Coordination, Resource Readiness, & Aid Transparency Network",
  version: "1.0.0",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000",
  mapStyleUrl: resolveMapStyleUrl(),
  mapCenter: resolveCoordinates(),
  mapZoom: resolveZoom(),
  enableDemoData: process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA !== "false", // Default enabled for instant interactive preview
};

export function hasSupabasePublicConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );
}

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error("Safe Sphere account and database services are not configured. Please supply NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.");
  }

  return { url, publishableKey };
}
