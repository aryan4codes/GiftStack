import { createServiceClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as { food_cart?: unknown };
  const sb = createServiceClient();
  const { error } = await sb
    .from("gifts")
    .update({ food_cart: body.food_cart ?? [] })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
