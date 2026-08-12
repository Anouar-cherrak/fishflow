import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client serveur uniquement, avec les pleins pouvoirs. Ne jamais importer ce fichier dans un composant client.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}