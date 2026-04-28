import { createServiceClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurant_id");
  const date = searchParams.get("date");
  if (!restaurantId || !date) {
    return NextResponse.json(
      { error: "restaurant_id and date (YYYY-MM-DD) required" },
      { status: 400 }
    );
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("cached_dineout_slots")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("date", date)
    .order("display_time");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ slots: data ?? [] });
}
