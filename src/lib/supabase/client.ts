import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/config";

export function createClient() {
  const { url, publishableKey } = getSupabasePublicConfig();
  return createBrowserClient(url, publishableKey);
}
