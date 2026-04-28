import { createServiceClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as {
    chosen_type?: "dineout" | "instamart" | "food";
    restaurant_id?: string;
  };
  if (!body.chosen_type) {
    return NextResponse.json({ error: "chosen_type required" }, { status: 400 });
  }

  const sb = createServiceClient();
  const { error } = await sb
    .from("gifts")
    .update({
      chosen_type: body.chosen_type,
      status: "choosing",
      opened_at: new Date().toISOString(),
      redemption_meta: body.restaurant_id
        ? { dineout_restaurant_id: body.restaurant_id }
        : null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
