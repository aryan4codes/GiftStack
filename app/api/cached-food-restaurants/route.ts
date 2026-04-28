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
      "id,name,cuisine,area,city,rating,delivery_time,image_url,availability_status"
    )
    .ilike("city", `%${city}%`)
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(120);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ restaurants: data ?? [] });
}
