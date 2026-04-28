/**
 * Convert a single Swiggy MCP JSON file → one part file for compose-mcp-cache.ts
 *
 * Detects:
 * - Dineout search: { success, data: { restaurants } }
 * - Food search: { success, data: { restaurants } } (Swiggy Food)
 * - Instamart search: { success, data: { products } }
 * - Menu: { success, data: { restaurant, categories } }
 *
 * Usage:
 *   npx tsx scripts/import-mcp-snapshot.ts path/to/mcp.json [--menu-out]
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  dineRestToCached,
  foodRestToCached,
  type DineSearchRest,
  type FoodSearchRest,
} from "./mcp-transformers";

type CachePart = Record<string, unknown>;

function flattenMenuCategories(
  data: Record<string, unknown>,
  rid: string
): Record<string, unknown>[] {
  const categories = data.categories as
    | { title?: string; items?: unknown[]; subcategories?: unknown[] }[]
    | undefined;
  const out: Record<string, unknown>[] = [];
  if (!categories) return out;

  function walk(catTitle: string, items: unknown[] | undefined) {
    if (!items) return;
    for (const raw of items) {
      const it = raw as Record<string, unknown>;
      const priceRupee = typeof it.price === "number" ? it.price : 0;
      out.push({
        id: String(it.id ?? ""),
        restaurant_id: rid,
        name: String(it.name ?? ""),
        category: catTitle,
        price_paise: Math.round(priceRupee * 100),
        description: typeof it.description === "string" ? it.description.slice(0, 280) : null,
        is_veg: it.isVeg === true ? true : it.isVeg === false ? false : null,
        image_url: it.imageUrl ?? null,
        has_variants: !!(it.hasVariants ?? it.has_variants),
        has_addons: !!(it.hasAddons ?? it.has_addons),
        raw_data: {},
      });
    }
  }

  for (const c of categories) {
    const ct = String(c.title ?? "");
    walk(ct, c.items as unknown[] | undefined);
    const subs = c.subcategories as { title?: string; items?: unknown[] }[] | undefined;
    if (subs)
      for (const s of subs) walk(ct + " › " + String(s.title ?? ""), s.items as unknown[]);
  }
  return out.filter((r) => r.id && r.restaurant_id);
}

function instamartToProducts(data: Record<string, unknown>, city = "Mumbai") {
  const products = data.products as
    | {
        displayName?: string;
        brand?: string;
        variations?: {
          spinId?: string;
          displayName?: string;
          brandName?: string;
          price?: { offerPrice?: number; mrp?: number };
          imageUrl?: string;
          quantityDescription?: string;
        }[];
        productId?: string;
      }[]
    | undefined;
  const rows: Record<string, unknown>[] = [];
  if (!products) return rows;

  function catFrom(q: string) {
    const s = q.toLowerCase();
    if (/choco|sweet|candy|laddu/.test(s)) return "Chocolate & sweets";
    if (/gift| hamper|celebr/.test(s)) return "Gift & hampers";
    if (/fruit|nuts|dry|almond|pista/.test(s)) return "Dry fruits & nuts";
    if (/tea|coffee|premium/.test(s)) return "Tea & gifting";
    return "Gifting";
  }

  const qHint = typeof data === "object" && data ? (data as any)._queryHint : "";

  for (const p of products) {
    for (const v of p.variations ?? []) {
      const spinId = String(v.spinId ?? "");
      if (!spinId) continue;
      const op = Number(v.price?.offerPrice ?? v.price?.mrp ?? 0);
      rows.push({
        id: spinId,
        name: String(v.displayName ?? p.displayName ?? ""),
        brand: String(v.brandName ?? p.brand ?? ""),
        category: catFrom(String(qHint)),
        price_paise: Math.round(op * 100),
        image_url: v.imageUrl ?? null,
        city,
        raw_data: { quantityDescription: v.quantityDescription, parentProductId: p.productId },
      });
    }
  }
  return rows;
}

function slotsResponseToCached(raw: Record<string, unknown>) {
  const slots = raw.slots as
    | {
        slotId?: number;
        displayTime?: string;
        reservationTime?: string;
        slotGroupName?: string;
        dateStr?: string;
        deals?: { itemId?: string; isFree?: boolean }[];
      }[]
    | undefined;
  const rid = String(raw.restaurantId ?? "");
  if (!Array.isArray(slots) || !rid) return [];
  const out: Record<string, unknown>[] = [];
  for (const s of slots) {
    const deal = s.deals?.find((d) => d.isFree) ?? s.deals?.[0];
    const rt = s.reservationTime ? parseInt(String(s.reservationTime), 10) : 0;
    out.push({
      restaurant_id: rid,
      date: s.dateStr ?? "",
      slot_group: s.slotGroupName ?? "",
      display_time: s.displayTime ?? "",
      slot_id: s.slotId ?? null,
      item_id: String(deal?.itemId ?? ""),
      reservation_time: Number.isFinite(rt) ? rt : null,
      is_free: deal?.isFree !== false,
      raw_data: {},
    });
  }
  return out.filter((r) => r.restaurant_id && r.date && r.display_time);
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--force");
  const force = process.argv.includes("--force");
  const inFile = args[0];
  if (!inFile || !fs.existsSync(inFile)) {
    console.error(
      "Usage: npx tsx scripts/import-mcp-snapshot.ts <mcp-response.json> [--force]"
    );
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(inFile, "utf8")) as Record<string, unknown>;
  const part: CachePart = { _meta: { sourceFile: path.basename(inFile) } };

  // Dineout get_available_slots: { success, slots, restaurantId, ... }
  if (Array.isArray((raw as { slots?: unknown }).slots) && (raw as { restaurantId?: string }).restaurantId) {
    part.cached_dineout_slots = slotsResponseToCached(raw);
    part._meta = {
      ...(part._meta as Record<string, unknown>),
      kind: "dineout_slots",
    };
    const outDir = path.join(process.cwd(), "data/mcp-seeds/parts");
    fs.mkdirSync(outDir, { recursive: true });
    const slug = path.basename(inFile, path.extname(inFile)).replace(/[^a-z0-9_-]+/gi, "-");
    const dest = path.join(outDir, `${slug}.json`);
    if (!force && fs.existsSync(dest)) {
      console.log(`Skip (exists): ${dest} — pass --force to overwrite`);
      return;
    }
    fs.writeFileSync(dest, JSON.stringify(part, null, 2), "utf8");
    console.log(`Wrote ${dest}`);
    return;
  }

  const data = (raw.success ? raw.data : raw) as Record<string, unknown> | undefined;
  if (!data) {
    console.error("Unrecognized JSON");
    process.exit(1);
  }

  const rests = data.restaurants as unknown[];
  const firstFood = rests?.[0] as Record<string, unknown> | undefined;
  const looksLikeFoodDelivery =
    firstFood &&
    Object.prototype.hasOwnProperty.call(firstFood, "cuisines") &&
    typeof firstFood.avgRating !== "undefined";

  if (Array.isArray(data.restaurants) && looksLikeFoodDelivery) {
    part.cached_food_restaurants = (data.restaurants as FoodSearchRest[]).map((r) =>
      foodRestToCached(r)
    );
    part._meta = {
      ...(part._meta as Record<string, unknown>),
      kind: "food_search",
    };
  } else if (Array.isArray(data.restaurants) && typeof (data.restaurants as any)[0]?.cuisine !== "undefined") {
    part.cached_dineout_restaurants = (data.restaurants as DineSearchRest[]).map((r) =>
      dineRestToCached(r)
    );
    part._meta = {
      ...(part._meta as Record<string, unknown>),
      kind: "dineout_search",
    };
  } else if (Array.isArray(data.products)) {
    const qh =
      ((raw as { _meta?: { queryHint?: string } })._meta?.queryHint as string | undefined) ??
      ((data as { _queryHint?: string })._queryHint as string | undefined) ??
      process.env.IM_QUERY_HINT;
    part.cached_instamart_products = instamartToProducts(
      Object.assign({}, data as object, qh ? { _queryHint: qh } : {}) as Record<
        string,
        unknown
      > & { _queryHint?: string }
    );
    part._meta = {
      ...(part._meta as Record<string, unknown>),
      kind: "instamart_search",
    };
  } else if (data.categories && data.restaurant) {
    const rid = String((data.restaurant as { id?: string }).id ?? "");
    part.cached_food_menu_items = flattenMenuCategories(data as any, rid);
    part.cached_food_restaurants = [
      foodRestToCached({
        ...((data.restaurant as object) ?? {}),
        id: rid,
      } as FoodSearchRest),
    ];
    part._meta = {
      ...(part._meta as Record<string, unknown>),
      kind: "food_menu",
    };
  } else {
    console.error("Could not classify snapshot");
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), "data/mcp-seeds/parts");
  fs.mkdirSync(outDir, { recursive: true });
  const slug = path.basename(inFile, path.extname(inFile)).replace(/[^a-z0-9_-]+/gi, "-");
  const out = path.join(outDir, `${slug}.json`);
  if (!force && fs.existsSync(out)) {
    console.log(`Skip (exists): ${out} — pass --force to overwrite`);
    return;
  }
  fs.writeFileSync(out, JSON.stringify(part, null, 2), "utf8");
  console.log(`Wrote ${out}`);
}

main();
