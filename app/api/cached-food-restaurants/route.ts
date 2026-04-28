import { createServiceClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/** Public read: cached Swiggy-food restaurants for browsing in the food-credit flow */
export async function GET(req: Request) {
  const city = new URL(req.url).searchParams.get("city")?.trim();
  if (!city) {
    return NextResponse.json({ error: "Missing city query" }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("cached_food_restaurants")
    .select(
      "id,name,cuisine,area,city,rating,delivery_time,image_url,availability_status",
    )
    .ilike("city", `%${city}%`)
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(120);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const ids = rows.map((r) => r.id as string).filter(Boolean);

  let countsReady = false;
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: countRows, error: cErr } = await sb.rpc(
      "food_menu_counts_by_restaurant_ids",
      { rest_ids: ids },
    );
    if (!cErr && Array.isArray(countRows)) {
      countsReady = true;
      for (const row of countRows as { restaurant_id: string; item_count: number }[]) {
        counts.set(String(row.restaurant_id), Number(row.item_count) || 0);
      }
    }
  }

  const restaurants = rows.map((r) => ({
    ...r,
    menu_item_count: countsReady ? (counts.get(r.id as string) ?? 0) : null,
  }));

  return NextResponse.json({ restaurants });
}
