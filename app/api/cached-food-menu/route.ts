import { createServiceClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export type FoodMenuRow = {
  id: string;
  restaurant_id: string;
  name: string;
  category: string | null;
  price_paise: number | null;
  description: string | null;
  is_veg: boolean | null;
  image_url: string | null;
  has_variants: boolean;
  has_addons: boolean;
};

/** Public read: full menu cache for one restaurant — food-credit picker flow */
export async function GET(req: Request) {
  const restaurantId = new URL(req.url).searchParams.get("restaurant_id")?.trim();
  if (!restaurantId) {
    return NextResponse.json({ error: "Missing restaurant_id" }, { status: 400 });
  }

  const sb = createServiceClient();

  const { data: restaurant, error: rErr } = await sb
    .from("cached_food_restaurants")
    .select(
      "id,name,cuisine,area,city,rating,delivery_time,image_url,availability_status",
    )
    .eq("id", restaurantId)
    .maybeSingle();

  if (rErr) {
    return NextResponse.json({ error: rErr.message }, { status: 500 });
  }

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found in cache", restaurant_id: restaurantId }, { status: 404 });
  }

  const { data: itemsRaw, error: mErr } = await sb
    .from("cached_food_menu_items")
    .select(
      "id,restaurant_id,name,category,price_paise,description,is_veg,image_url,has_variants,has_addons",
    )
    .eq("restaurant_id", restaurantId)
    .limit(600);

  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  const items = (itemsRaw ?? []) as FoodMenuRow[];
  /** Group preserve order — first occurrence of category wins */
  const order: string[] = [];
  const byCat = new Map<string, FoodMenuRow[]>();
  for (const it of items) {
    const k = it.category ?? "Menu";
    if (!byCat.has(k)) {
      byCat.set(k, []);
      order.push(k);
    }
    byCat.get(k)!.push(it);
  }

  const grouped = order.map((title) => ({ title, items: byCat.get(title)! }));

  return NextResponse.json({
    restaurant,
    grouped,
    items,
    menuItemCount: items.length,
    hasLinkedMenu: items.length > 0,
  });
}
