import { createServiceClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/** Mark gift as opened when recipient lands on /g/[id] */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = createServiceClient();
  await sb
    .from("gifts")
    .update({
      status: "opened",
      opened_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("opened_at", null);

  return NextResponse.json({ ok: true });
}
