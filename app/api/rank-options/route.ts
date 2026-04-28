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
      message?: string;
      tone?: string;
    };
    const city = body.city?.trim() || "Bangalore";
    const budget = typeof body.budget_paise === "number" ? body.budget_paise : 150000;
    const occasion = body.occasion || "thank_you";
    const message = body.message?.trim() ?? "";
    const tone = body.tone?.trim();

    let sb: ReturnType<typeof createServiceClient>;
    try {
      sb = createServiceClient();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Missing Supabase service configuration";
      console.error(err);
      return NextResponse.json(
        {
          error:
            "Cannot read Swiggy cache: set SUPABASE_SERVICE_ROLE_KEY on the server (see lib/supabase/admin.ts).",
          detail: msg,
        },
        { status: 503 }
      );
    }

    const raw = await buildOptionsFromCache(sb, city, budget, {
      occasion,
      message,
      tone,
    });
    const options = await enrichOptionsCopy(raw, occasion);
    return NextResponse.json({ options });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Rank failed";
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
