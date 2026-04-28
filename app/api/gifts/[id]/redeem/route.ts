import { createServiceClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as {
    type?: "dineout" | "instamart" | "food";
    details?: Record<string, unknown>;
  };
  const t = body.type;
  if (!t) {
    return NextResponse.json({ error: "type required" }, { status: 400 });
  }

  const sb = createServiceClient();
  const { error } = await sb
    .from("gifts")
    .update({
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
      chosen_option: body.details ?? {},
      chosen_type: t,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
