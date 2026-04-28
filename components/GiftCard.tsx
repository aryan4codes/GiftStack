import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { GiftOptionsPayload } from "@/types/gift";

type Props =
  | {
      kind: "dineout";
      option: GiftOptionsPayload["dineout"][0];
      href: string;
      highlight?: boolean;
      showCta?: boolean;
      onChoose?: () => void;
    }
  | {
      kind: "instamart";
      option: GiftOptionsPayload["instamart"];
      href: string;
      highlight?: boolean;
      showCta?: boolean;
      onChoose?: () => void;
    }
  | {
      kind: "food";
      option: GiftOptionsPayload["food_credit"];
      href: string;
      highlight?: boolean;
      showCta?: boolean;
      onChoose?: () => void;
    };

export function GiftCard(p: Props) {
  const highlight = p.highlight;
  const showCta = p.showCta !== false;
  return (
    <Card className={`relative overflow-hidden ${highlight ? "ring-2 ring-[var(--color-accent)]/50" : ""}`}>
      {highlight ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 animate-shimmer-bg opacity-80"
          aria-hidden
        />
      ) : null}
      <CardHeader>
        <CardTitle className="text-base">
          {p.kind === "dineout" && "Dineout · Table"}
          {p.kind === "instamart" && "Instamart · Hamper"}
          {p.kind === "food" && "Food · Credit"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {p.kind === "dineout" && (
          <>
            <p className="font-display text-xl font-semibold">{p.option.name}</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {[p.option.cuisine, p.option.area].filter(Boolean).join(" · ")}
            </p>
            <p className="text-sm leading-relaxed">{p.option.pitch}</p>
          </>
        )}
        {p.kind === "instamart" && (
          <>
            <p className="text-sm leading-relaxed">{p.option.description}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {p.option.items.length} items · ₹
              {(p.option.estimated_total_paise / 100).toFixed(0)} est.
            </p>
          </>
        )}
        {p.kind === "food" && (
          <>
            <p className="font-display text-2xl text-[var(--color-accent)]">
              ₹{(p.option.amount_paise / 100).toLocaleString("en-IN")}
            </p>
            <p className="text-sm leading-relaxed">{p.option.description}</p>
          </>
        )}
        {showCta ? (
          <Button variant="outline" className="w-full" asChild>
            <Link
              href={p.href}
              onClick={() => {
                if ("onChoose" in p) p.onChoose?.();
              }}
            >
              Choose
            </Link>
          </Button>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            Preview
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
