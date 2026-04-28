"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/magicui/animated-number";
import Link from "next/link";

export function FoodChatAgent({
  giftId,
  budgetPaise,
}: {
  giftId: string;
  budgetPaise: number;
}) {
  const [input, setInput] = React.useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/agent/chat",
      body: { giftId },
    }),
  });

  return (
    <div className="flex min-h-[520px] flex-col gap-6">
      <div className="flex items-end justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-white/75 px-5 py-4 shadow-sm backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Budget left
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--color-accent)]">
            <AnimatedNumber value={Math.round(budgetPaise / 100)} prefix="₹" />
          </p>
        </div>
        <p className="max-w-xs text-right text-xs leading-relaxed text-[var(--color-text-muted)]">
          The agent searches cached dishes and edits your cart with tools until you confirm.
        </p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden rounded-3xl border-[var(--color-border)] bg-gradient-to-b from-white to-[#fffaf7] p-1 shadow-[0_24px_60px_rgba(80,45,20,0.08)]">
        <div className="scrollbar-thin max-h-[400px] flex-1 space-y-4 overflow-y-auto p-5 pb-2">
          {messages.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              Say what you&apos;re in the mood for — the agent searches cached menus
              and builds your cart within budget.
            </p>
          ) : null}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "bg-[var(--color-accent)] text-white"
                    : "border border-[var(--color-border)] bg-white text-[var(--color-text)]"
                }`}
              >
                {m.parts
                  .filter((part) => part.type === "text")
                  .map((part, i) => (
                    <span key={`${m.id}-${i}`}>
                      {"text" in part ? part.text : ""}
                    </span>
                  ))}
              </div>
            </div>
          ))}
          {status === "streaming" || status === "submitted" ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              Thinking with tools…
            </p>
          ) : null}
        </div>
        <form
          className="mt-2 flex gap-2 border-t border-[var(--color-border)] bg-white/90 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            void sendMessage({ text: input });
            setInput("");
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Try: "Japanese or Thai, something light"'
            className="flex-1 rounded-full border-[var(--color-border)] bg-white"
          />
          <Button type="submit" disabled={status === "streaming"} className="shrink-0 rounded-full px-6">
            Send
          </Button>
        </form>
      </Card>

      <Button variant="outline" asChild className="w-full sm:w-auto">
        <Link href={`/g/${giftId}/confirmed`}>View confirmation</Link>
      </Button>
    </div>
  );
}
