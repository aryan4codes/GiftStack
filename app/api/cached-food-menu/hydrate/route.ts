/**
 * Upsert dishes from raw Swiggy Food MCP `get_restaurant_menu` JSON (pagination-friendly:
 * POST one page worth of categories at a time, or merged payload). Secured by FOOD_MENU_HYDRATE_SECRET.
 *
 * Body shape (either):
 * - `{ categories: [...], restaurant: { id, name?, ... } }` (MCP `data`)
 * - Full MCP envelope `{ success: true, data: { categories, restaurant } }`
 */
import { createServiceClient } from "@/lib/supabase/admin";
import {
  flattenFoodMenuCategories,
  type SwiggyFoodMenuBlob,
} from "@/lib/swiggy/flatten-food-menu";
import { NextResponse } from "next/server";

/** Same as `scripts/mcp-transformers.foodRestToCached` — keep API self-contained. */
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

export async function POST(req: Request) {
  const expected = process.env.FOOD_MENU_HYDRATE_SECRET;
  const got = req.headers.get("x-food-menu-hydrate-secret");
  if (!expected?.trim()) {
    return NextResponse.json(
      { error: "FOOD_MENU_HYDRATE_SECRET is not configured on this server." },
      { status: 501 },
    );
  }
  if (got !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const envelope = body as { success?: boolean; data?: SwiggyFoodMenuBlob };
  const raw =
    (envelope.success && envelope.data ? envelope.data : body) as SwiggyFoodMenuBlob &
      Record<string, unknown>;

  const restFromPayload = raw.restaurant as { id?: string } | undefined;
  const categories = raw.categories;

  let restaurantId = typeof body.restaurant_id === "string" ? body.restaurant_id.trim() : "";
  if (!restaurantId && restFromPayload?.id) {
    restaurantId = String(restFromPayload.id);
  }
  if (!restaurantId) {
    return NextResponse.json(
      { error: "Provide restaurant_id or data.restaurant.id" },
      { status: 400 },
    );
  }

  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return NextResponse.json(
      { error: "categories[] required (merge pages from MCP if paginated)." },
      { status: 400 },
    );
  }

  const dataBlob: SwiggyFoodMenuBlob = {
    ...raw,
    restaurant: restFromPayload ?? { id: restaurantId },
    categories: categories as SwiggyFoodMenuBlob["categories"],
  };

  let menuRows = flattenFoodMenuCategories(dataBlob, restaurantId);
  const dedup = new Map<string, Record<string, unknown>>();
  for (const r of menuRows) {
    const id = String(r.id ?? "");
    if (id) dedup.set(id, r);
  }
  menuRows = [...dedup.values()];
  if (menuRows.length === 0) {
    return NextResponse.json(
      { error: "No menu rows produced — check category/item shapes." },
      { status: 400 },
    );
  }

  const sb = createServiceClient();

  const restRow =
    restFromPayload && typeof restFromPayload === "object" && restFromPayload.id
      ? foodRestRowFromMcp(
          restFromPayload as Parameters<typeof foodRestRowFromMcp>[0],
          "Mumbai",
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
  if (uRest) {
    return NextResponse.json({ error: uRest.message }, { status: 500 });
  }

  const { error: uMenu } = await sb.from("cached_food_menu_items").upsert(menuRows, {
    onConflict: "id",
  });
  if (uMenu) {
    return NextResponse.json({ error: uMenu.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    restaurant_id: restaurantId,
    upserted_menu_items: menuRows.length,
  });
}
