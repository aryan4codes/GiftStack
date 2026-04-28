import { auth, currentUser } from "@clerk/nextjs/server";
import { buildOptionsFromCache } from "@/lib/build-options";
import { enrichOptionsCopy } from "@/lib/llm/rank-copy";
import { parseGiftIntent } from "@/lib/llm/parsers";
import { createGiftId } from "@/lib/id";
import { createServiceClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/** One-click demo: creates a fully-populated gift from natural language. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt } = (await req.json()) as { prompt?: string };
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const parsed = await parseGiftIntent(prompt);
  const user = await currentUser();
  const sb = createServiceClient();

  await sb.from("users").upsert(
    {
      id: userId,
      email: user?.emailAddresses[0]?.emailAddress ?? null,
      name:
        user?.firstName ||
        user?.username ||
        user?.emailAddresses[0]?.emailAddress ||
        "Demo sender",
      avatar_url: user?.imageUrl ?? null,
    },
    { onConflict: "id" }
  );

  const raw = await buildOptionsFromCache(sb, parsed.city, parsed.budget_paise);
  const options = await enrichOptionsCopy(raw, parsed.occasion);

  const id = createGiftId();
  const expires_at = new Date();
  expires_at.setDate(expires_at.getDate() + 30);

  const { error } = await sb.from("gifts").insert({
    id,
    sender_id: userId,
    sender_name:
      user?.firstName ||
      user?.username ||
      user?.emailAddresses[0]?.emailAddress ||
      "Demo sender",
    recipient_email: null,
    recipient_name: "Demo recipient",
    budget_paise: parsed.budget_paise,
    occasion: parsed.occasion,
    city: parsed.city,
    message: parsed.message_draft,
    tone: parsed.tone ?? "warm",
    options,
    status: "created",
    expires_at: expires_at.toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.json({
    ok: true,
    giftId: id,
    giftUrl: `${base}/g/${id}`,
    parse: parsed,
  });
}
