import { buildOptionsFromCache } from "@/lib/build-options";
import { enrichOptionsCopy } from "@/lib/llm/rank-copy";
import { createServiceClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      city?: string;
      budget_paise?: number;
      occasion?: string;
    };
    const city = body.city?.trim() || "Bangalore";
    const budget = typeof body.budget_paise === "number" ? body.budget_paise : 150000;
    const occasion = body.occasion || "thank_you";

    const sb = createServiceClient();
    const raw = await buildOptionsFromCache(sb, city, budget);
    const options = await enrichOptionsCopy(raw, occasion);
    return NextResponse.json({ options });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Rank failed" }, { status: 500 });
  }
}
