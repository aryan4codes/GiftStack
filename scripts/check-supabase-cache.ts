/**
 * Prints row counts and sample cities for cached_* tables (same env as Next.js).
 * Run: npx tsx scripts/check-supabase-cache.ts
 *
 * If counts are 0, run: npm run seed  (uploads data/mcp-seeds/cache.json)
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — API routes cannot read Swiggy cache without the service role key."
    );
    process.exit(1);
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tables = [
    "cached_dineout_restaurants",
    "cached_dineout_slots",
    "cached_instamart_products",
    "cached_food_restaurants",
    "cached_food_menu_items",
  ] as const;

  console.log(`Supabase: ${url}\n`);

  for (const t of tables) {
    const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`${t}: ERROR — ${error.message}`);
      continue;
    }
    console.log(`${t}: ${count ?? 0} rows`);
  }

  const { data: cities, error: cErr } = await sb
    .from("cached_dineout_restaurants")
    .select("city")
    .limit(200);
  if (!cErr && cities?.length) {
    const uniq = [...new Set(cities.map((r) => String(r.city)).filter(Boolean))];
    console.log(`\nDine-out city values (sample): ${uniq.slice(0, 12).join(", ")}${uniq.length > 12 ? "…" : ""}`);
  }

  const { data: imCities, error: iErr } = await sb
    .from("cached_instamart_products")
    .select("city")
    .limit(200);
  if (!iErr && imCities?.length) {
    const uniq = [...new Set(imCities.map((r) => (r.city ? String(r.city) : "(null)")))];
    console.log(`Instamart city values (sample): ${uniq.slice(0, 12).join(", ")}${uniq.length > 12 ? "…" : ""}`);
  }

  console.log(
    "\nIf dine-out or Instamart counts are 0, gift previews will be empty until you seed:\n  npm run seed\n"
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
