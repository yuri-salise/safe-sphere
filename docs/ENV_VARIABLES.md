# Safe Sphere — Environment Variables Reference

This document details all supported environment variables for **Safe Sphere**.

## Quick Template

Create `.env.local` in the project root:

```env
# Application Host
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Branding & Metadata
NEXT_PUBLIC_APP_NAME="Safe Sphere"
NEXT_PUBLIC_APP_DESCRIPTION="Next-Gen Real-Time Disaster Coordination & Aid Transparency Platform"

# Supabase Infrastructure (Required for Live Auth & Database)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here

# GIS Map Configuration
NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty
NEXT_PUBLIC_MAP_DEFAULT_LNG=125.0499
NEXT_PUBLIC_MAP_DEFAULT_LAT=7.8582
NEXT_PUBLIC_MAP_DEFAULT_ZOOM=14

# Simulation & Demo Mode
NEXT_PUBLIC_ENABLE_DEMO_DATA=true
```

---

## Detailed Variable Specifications

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | No | `http://localhost:3000` | The canonical base URL for the web application. Used for Supabase Auth callback redirects and absolute link generation. |
| `NEXT_PUBLIC_APP_NAME` | No | `"Safe Sphere"` | The public application name displayed in the header, metadata titles, and notification feeds. |
| `NEXT_PUBLIC_APP_DESCRIPTION` | No | `"Next-Gen..."` | The default SEO meta description rendered in HTML headers. |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** (in production) | `undefined` | The HTTPS endpoint for your Supabase project (from Supabase Dashboard → Settings → API). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Yes** (in production) | `undefined` | The public/anon publishable key for your Supabase project. Safe for browser exposure. |
| `NEXT_PUBLIC_MAP_STYLE_URL` | No | OpenFreeMap Liberty | HTTP(S) URL to any MapLibre-compatible style JSON. For dark crypto themes, you can use OpenFreeMap Dark or Carto Dark Matter. |
| `NEXT_PUBLIC_MAP_DEFAULT_LNG` | No | `125.0499` | Default longitude coordinate centered when opening the GIS map or location picker. |
| `NEXT_PUBLIC_MAP_DEFAULT_LAT` | No | `7.8582` | Default latitude coordinate centered when opening the GIS map or location picker. |
| `NEXT_PUBLIC_MAP_DEFAULT_ZOOM` | No | `14` | Initial zoom level for the GIS map viewport. |
| `NEXT_PUBLIC_ENABLE_DEMO_DATA` | No | `true` (dev) / `false` (prod) | When enabled, renders sample disaster incidents and metrics for instant local demonstration even before connecting a Supabase project. |

---

## Production Security Notes

1. **Never commit `.env.local` to git**. Only commit `.env.example`.
2. When deploying to **Vercel**, **Docker**, or **Cloud Hosting**, configure these variables under the host's Environment Variables settings panel.
3. Keep `NEXT_PUBLIC_ENABLE_DEMO_DATA=false` in production environments so that only verified, live database records appear on the map and situational overview.
