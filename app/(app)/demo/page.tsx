"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Terminal } from "lucide-react";

export default function DemoOperatorPage() {
  const [prompt, setPrompt] = React.useState(
    "Thank you gift for my client in Mumbai, ₹1500 budget, birthday"
  );
  const [result, setResult] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/demo/operator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const j = await res.json();
      setResult(JSON.stringify(j, null, 2));
    } catch {
      setResult("Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <div>
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          <Terminal className="h-4 w-4 text-[var(--color-accent)]" aria-hidden />
          Internal
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-[var(--color-ink)] sm:text-4xl">
          Demo operator
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)]">
          One POST builds a full gift row: parsed intent, cached option cards, and a
          recipient link — useful when you&apos;re testing the stack without the UI.
        </p>
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[var(--color-border)] bg-white/60">
          <CardTitle className="text-lg text-[var(--color-ink)]">Prompt</CardTitle>
          <CardDescription>
            Same shape as the composer on <span className="font-medium">/create</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-7">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            className="rounded-2xl border-[var(--color-border)] bg-white/90 font-mono text-sm leading-relaxed"
          />
          <Button
            onClick={run}
            disabled={loading}
            className="rounded-full px-8"
          >
            {loading ? "Running…" : "Create demo gift"}
          </Button>
          {result ? (
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[#1a120c] p-5 text-left shadow-inner">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-white/50">
                Response JSON
              </p>
              <pre className="max-h-96 overflow-auto text-xs leading-relaxed text-emerald-100/95">
                {result}
              </pre>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
