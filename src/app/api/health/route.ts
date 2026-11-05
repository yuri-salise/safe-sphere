import { NextResponse } from "next/server";
import { appConfig, hasSupabasePublicConfig } from "@/lib/config";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: appConfig.name,
    version: appConfig.version,
    supabaseConfigured: hasSupabasePublicConfig(),
    timestamp: new Date().toISOString(),
  });
}
