import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (e) {
    console.error("Clerk webhook verify failed", e);
    return new Response("Invalid signature", { status: 400 });
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const sb = createServiceClient();
    const email =
      evt.data.email_addresses?.[0]?.email_address ?? null;
    const name =
      [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ") ||
      null;

    await sb.from("users").upsert({
      id: evt.data.id,
      email,
      name,
      avatar_url: evt.data.image_url ?? null,
    });
  }

  return new Response("ok", { status: 200 });
}
