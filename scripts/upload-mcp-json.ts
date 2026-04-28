/**
 * Load MCP-export JSON → Supabase cached_* tables.
 *
 * Fill data/mcp-seeds/cache.json using Cursor Swiggy MCP tool output (normalize to rows).
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: MCP_CACHE_JSON=/absolute/path/to/cache.json
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";

type CacheFile = {
  cached_dineout_restaurants?: Record<string, unknown>[];
  cached_dineout_slots?: Record<string, unknown>[];
  cached_food_restaurants?: Record<string, unknown>[];
  cached_food_menu_items?: Record<string, unknown>[];
  cached_instamart_products?: Record<string, unknown>[];
};

const jsonPath =
  process.env.MCP_CACHE_JSON ??
  path.join(process.cwd(), "data/mcp-seeds/cache.json");

function load(): CacheFile {
  const raw = fs.readFileSync(jsonPath, "utf8");
  return JSON.parse(raw) as CacheFile;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const data = load();
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function upsertRows(
    table: string,
    rows: Record<string, unknown>[] | undefined,
    conflict = "id"
  ) {
    if (!rows?.length) {
      console.log(`${table}: 0 rows (skip)`);
      return;
    }
    const { error } = await sb.from(table).upsert(rows, {
      onConflict: conflict,
    });
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`${table}: ${rows.length} rows upserted`);
  }

  await upsertRows("cached_dineout_restaurants", data.cached_dineout_restaurants);

  const dineoutIds = new Set(
    (data.cached_dineout_restaurants ?? []).map((r) => String(r.id))
  );
  const slots = (data.cached_dineout_slots ?? []).filter((s) =>
    dineoutIds.has(String(s.restaurant_id))
  );
  if (
    (data.cached_dineout_slots?.length ?? 0) > 0 &&
    slots.length < (data.cached_dineout_slots?.length ?? 0)
  ) {
    console.log(
      `cached_dineout_slots: dropped ${(data.cached_dineout_slots?.length ?? 0) - slots.length} row(s) (no matching cached_dineout_restaurants id)`
    );
  }

  if (slots?.length) {
    const ids = [...new Set(slots.map((s) => String(s.restaurant_id)))];
    await sb.from("cached_dineout_slots").delete().in("restaurant_id", ids);
    const cleaned = slots.map(({ id: _id, ...rest }) => rest);
    const { error } = await sb.from("cached_dineout_slots").insert(cleaned);
    if (error) throw new Error(`cached_dineout_slots: ${error.message}`);
    console.log(`cached_dineout_slots: ${cleaned.length} rows inserted (replaced by restaurant)`);
  } else {
    console.log("cached_dineout_slots: 0 rows (skip)");
  }

  await upsertRows("cached_food_restaurants", data.cached_food_restaurants);

  await upsertRows("cached_food_menu_items", data.cached_food_menu_items);

  await upsertRows("cached_instamart_products", data.cached_instamart_products);

  console.log(`Done. Source: ${jsonPath}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
