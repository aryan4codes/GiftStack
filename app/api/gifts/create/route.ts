import { auth, currentUser } from "@clerk/nextjs/server";
import {
  buildOptionsFromCache,
  type GiftContextForOptions,
} from "@/lib/build-options";
import { enrichOptionsCopy } from "@/lib/llm/rank-copy";
import { createGiftId } from "@/lib/id";
import { createServiceClient } from "@/lib/supabase/admin";
import type { GiftOptionsPayload, ParsedIntent } from "@/types/gift";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        "Sender",
      avatar_url: user?.imageUrl ?? null,
    },
    { onConflict: "id" }
  );

  const body = (await req.json()) as {
    parsed: ParsedIntent;
    options?: GiftOptionsPayload;
    recipient_email?: string;
    recipient_name?: string;
  };

  const parsed = body.parsed;
  const city = parsed.city;
  const budget = parsed.budget_paise;
  const occasion = parsed.occasion;
  let options = body.options;
  if (!options) {
    const ctx: GiftContextForOptions = {
      occasion,
      message: parsed.message_draft,
      tone: parsed.tone ?? undefined,
    };
    const raw = await buildOptionsFromCache(sb, city, budget, ctx);
    options = await enrichOptionsCopy(raw, occasion);
  }

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
      "Sender",
    recipient_email: body.recipient_email ?? null,
    recipient_name: body.recipient_name ?? null,
    budget_paise: budget,
    occasion,
    city,
    message: parsed.message_draft,
    tone: parsed.tone ?? "warm",
    options,
    status: "created",
    expires_at: expires_at.toISOString(),
  });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.json({
    giftId: id,
    giftUrl: `${base}/g/${id}`,
  });
}
