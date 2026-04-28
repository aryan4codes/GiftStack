import { parseGiftIntent } from "@/lib/llm/parsers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = (await req.json()) as { text?: string };
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
