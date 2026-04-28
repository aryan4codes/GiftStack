/**
 * Merge partial MCP snapshot files into one cache.json (deduped by table PK).
 * Optional: pass glob via MCP_CACHE_PARTS_GLOB (default: data/mcp-seeds/parts/*.json)
 *
 * Each part file is a JSON object with any of:
 * cached_dineout_restaurants, cached_dineout_slots, cached_food_restaurants,
 * cached_food_menu_items, cached_instamart_products, _meta
 *
 * Run: npx tsx scripts/compose-mcp-cache.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";

type CacheFile = {
  _meta?: Record<string, unknown>;
  cached_dineout_restaurants?: Record<string, unknown>[];
  cached_dineout_slots?: Record<string, unknown>[];
  cached_food_restaurants?: Record<string, unknown>[];
  cached_food_menu_items?: Record<string, unknown>[];
  cached_instamart_products?: Record<string, unknown>[];
};

const outPath =
  process.env.MCP_CACHE_OUT ??
  path.join(process.cwd(), "data/mcp-seeds/cache.json");
const globDir = path.join(process.cwd(), "data/mcp-seeds/parts");

function readParts(): CacheFile[] {
  if (!fs.existsSync(globDir)) return [];
  const files = fs
    .readdirSync(globDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  return files.map((f) => {
    const raw = fs.readFileSync(path.join(globDir, f), "utf8");
    return JSON.parse(raw) as CacheFile;
  });
}

function dedupeById<T extends Record<string, unknown>>(rows: T[], idKey = "id"): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const id = String(r[idKey] ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
  return out;
}

function merge(): CacheFile {
  const parts = readParts();
  const merged: CacheFile = {
    _meta: {
      composedAt: new Date().toISOString(),
      city: "Mumbai",
      source: "Swiggy MCP",
      coords: [19.076, 72.8777],
    },
  };

  const dr: Record<string, unknown>[] = [];
  const slots: Record<string, unknown>[] = [];
  const fr: Record<string, unknown>[] = [];
  const menu: Record<string, unknown>[] = [];
  const im: Record<string, unknown>[] = [];

  for (const p of parts) {
    if (p._meta && typeof p._meta === "object")
      merged._meta = { ...merged._meta, ...p._meta };
    dr.push(...(p.cached_dineout_restaurants ?? []));
    slots.push(...(p.cached_dineout_slots ?? []));
    fr.push(...(p.cached_food_restaurants ?? []));
    menu.push(...(p.cached_food_menu_items ?? []));
    im.push(...(p.cached_instamart_products ?? []));
  }

  merged.cached_dineout_restaurants = dedupeById(dr);
  merged.cached_food_restaurants = dedupeById(fr);
  merged.cached_food_menu_items = dedupeById(menu);
  merged.cached_instamart_products = dedupeById(im);

  const slotKey = (s: Record<string, unknown>) =>
    [
      s.restaurant_id,
      s.date,
      s.display_time,
      s.item_id,
      s.reservation_time,
    ].join("|");
  {
    const seen = new Set<string>();
    merged.cached_dineout_slots = [];
    for (const s of slots) {
      const k = slotKey(s);
      if (seen.has(k)) continue;
      seen.add(k);
      merged.cached_dineout_slots.push(s);
    }
  }

  // Canonical header (part files may overwrite _meta during merge)
  const composedAt =
    typeof merged._meta?.composedAt === "string"
      ? merged._meta.composedAt
      : new Date().toISOString();
  merged._meta = {
    composedAt,
    city: "Mumbai",
    source: "Swiggy MCP",
    coords: [19.076, 72.8777],
  };

  return merged;
}

function main() {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const m = merge();
  fs.writeFileSync(outPath, JSON.stringify(m, null, 2), "utf8");
  console.log(
    JSON.stringify({
      out: outPath,
      dineout: m.cached_dineout_restaurants?.length ?? 0,
      slots: m.cached_dineout_slots?.length ?? 0,
      foodRest: m.cached_food_restaurants?.length ?? 0,
      menuItems: m.cached_food_menu_items?.length ?? 0,
      instamart: m.cached_instamart_products?.length ?? 0,
    })
  );
}

main();
