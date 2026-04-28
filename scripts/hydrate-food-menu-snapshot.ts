/**
 * Upsert MCP `get_restaurant_menu` envelopes from JSON files into
 * cached_food_restaurants + cached_food_menu_items (same semantics as POST /api/cached-food-menu/hydrate).
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local)
 *
 * Usage:
 *   node --env-file=.env.local ./node_modules/.bin/tsx scripts/hydrate-food-menu-snapshot.ts data/mcp-hydrated/cheelizza-merged.json data/mcp-hydrated/gfb-merged.json
 */
import * as fs from "node:fs";
import {
  flattenFoodMenuCategories,
  type SwiggyFoodMenuBlob,
} from "../lib/swiggy/flatten-food-menu";
import { createServiceClient } from "../lib/supabase/admin";

/** Same helper as hydrate route — keep restaurant meta fresh from MCP payloads. */
function foodRestRowFromMcp(
  r: {
    id?: string;
    name?: string;
    cuisines?: string[];
    areaName?: string;
    avgRating?: number;
    deliveryTimeRange?: string;
    imageUrl?: string;
    availabilityStatus?: string;
    distanceKm?: number;
  },
  city = "Mumbai",
) {
  const name = String(r.name ?? "").replace(/\s*\(Ad\)\s*/gi, "").trim();
  return {
    id: String(r.id),
    name,
    cuisine: r.cuisines ?? [],
    area: String(r.areaName ?? "").trim(),
    city,
    rating: r.avgRating ?? null,
    delivery_time: r.deliveryTimeRange ?? null,
    image_url: r.imageUrl ?? null,
    availability_status: r.availabilityStatus ?? "OPEN",
    raw_data: { distanceKm: r.distanceKm },
  };
}

function loadEnvelope(rawPath: string) {
  const raw = fs.readFileSync(rawPath, "utf8");
  const body = JSON.parse(raw) as { success?: boolean; data?: SwiggyFoodMenuBlob };

  const envelope = body.success && body.data ? body.data : (body as SwiggyFoodMenuBlob);
  const restFromPayload = envelope.restaurant as { id?: string } | undefined;
  const categories = envelope.categories;

  let restaurantId = "";
  if (restFromPayload?.id) restaurantId = String(restFromPayload.id);
  if (!restaurantId || !categories?.length) {
    throw new Error(`${rawPath}: need data.restaurant.id and categories[]`);
  }

  const dataBlob: SwiggyFoodMenuBlob = {
    ...envelope,
    restaurant: restFromPayload ?? { id: restaurantId },
    categories,
  };

  const menuRows = flattenFoodMenuCategories(dataBlob, restaurantId);
  const deduped = dedupeByMenuId(menuRows);
  return { restaurantId, restFromPayload, menuRows: deduped };
}

/** Same-id dish can appear under multiple category banners in MCP; upsert batch must be unique on `id`. */
function dedupeByMenuId(rows: Record<string, unknown>[]) {
  const seen = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const id = String(r.id ?? "");
    if (!id) continue;
    seen.set(id, r);
  }
  return [...seen.values()];
}

async function main() {
  const paths = process.argv.slice(2).filter(Boolean);
  if (!paths.length) {
    console.error(
      "Usage: tsx scripts/hydrate-food-menu-snapshot.ts <merged-envelope.json> [...]",
    );
    process.exit(1);
  }

  const sb = createServiceClient();

  for (const p of paths) {
    const { restaurantId, restFromPayload, menuRows } = loadEnvelope(p);
    console.log(`${p}: ${menuRows.length} flattened menu rows`);

    const restRow =
      restFromPayload && typeof restFromPayload === "object" && restFromPayload.id
        ? foodRestRowFromMcp(
            restFromPayload as Parameters<typeof foodRestRowFromMcp>[0],
          )
        : ({
            id: restaurantId,
            name: `Restaurant ${restaurantId}`,
            cuisine: [],
            area: "",
            city: "Mumbai",
            rating: null,
            delivery_time: null,
            image_url: null,
            availability_status: "OPEN",
            raw_data: {},
          } as Record<string, unknown>);

    const { error: uRest } = await sb.from("cached_food_restaurants").upsert(restRow, {
      onConflict: "id",
    });
    if (uRest) throw new Error(`${p} restaurant upsert: ${uRest.message}`);

    const { error: uMenu } = await sb.from("cached_food_menu_items").upsert(menuRows, {
      onConflict: "id",
    });
    if (uMenu) throw new Error(`${p} menu upsert: ${uMenu.message}`);

    console.log(`  ✓ cached_food_restaurants + ${menuRows.length} menu items (${restaurantId})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
