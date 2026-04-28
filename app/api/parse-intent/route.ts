import { parseGiftIntent } from "@/lib/llm/parsers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (!raw.trim()) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }
    let body: { text?: string };
    try {
      body = JSON.parse(raw) as { text?: string };
    } catch {
      return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
    }
    const { text } = body;
    if (!text?.trim()) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }
    const parsed = await parseGiftIntent(text);
    return NextResponse.json(parsed);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }
}
