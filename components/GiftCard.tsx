import Image from "next/image";
import Link from "next/link";
import { ChefHat, ShoppingBasket, UtensilsCrossed, ArrowRight } from "lucide-react";
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

const kindMeta = {
  dineout: {
    label: "Dine out",
    sub: "Reserve a table",
    icon: ChefHat,
    gradient: "from-orange-50 to-amber-50/60",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  instamart: {
    label: "Instamart",
    sub: "Curated hamper",
    icon: ShoppingBasket,
    gradient: "from-emerald-50 to-teal-50/60",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  food: {
    label: "Food credit",
    sub: "Order on Swiggy",
    icon: UtensilsCrossed,
    gradient: "from-violet-50 to-indigo-50/60",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
} as const;

export function GiftCard(p: Props) {
  const highlight = p.highlight;
  const showCta = p.showCta !== false;
  const meta = kindMeta[p.kind];
  const Icon = meta.icon;

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        highlight
          ? "border-[var(--color-accent)]/30 shadow-[0_24px_60px_rgba(252,128,25,0.14)]"
          : "border-[var(--color-border)] shadow-[0_12px_40px_rgba(80,45,20,0.06)]"
      }`}
    >
      {highlight && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 animate-shimmer-bg"
          aria-hidden
        />
      )}

      {/* Top gradient area with icon */}
      <div className={`bg-gradient-to-br ${meta.gradient} px-6 pb-5 pt-6`}>
        <div className="flex items-start justify-between">
          <div className={`grid h-11 w-11 place-items-center rounded-2xl ${meta.iconBg}`}>
            <Icon className={`h-5 w-5 ${meta.iconColor}`} aria-hidden />
          </div>
          {highlight && (
            <span className="rounded-full bg-[var(--color-accent)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              Top pick
            </span>
          )}
        </div>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          {meta.label}
        </p>
        <p className="font-display mt-1 text-xl font-semibold leading-snug text-[var(--color-ink)]">
          {meta.sub}
        </p>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4 bg-white px-6 pb-6 pt-5">
        {p.kind === "dineout" && (
          <>
            <div>
              <p className="font-display text-lg font-semibold text-[var(--color-ink)]">
                {p.option.name}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {[p.option.cuisine, p.option.area].filter(Boolean).join(" · ")}
              </p>
            </div>
            {p.option.image_url ? (
              <div className="relative aspect-[5/3] w-full overflow-hidden rounded-2xl bg-neutral-100 ring-1 ring-black/[0.06]">
                <Image
                  src={p.option.image_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 92vw, 360px"
                />
              </div>
            ) : null}
            <p className="flex-1 text-sm leading-relaxed text-[var(--color-text)]">
              {p.option.pitch}
            </p>
          </>
        )}
        {p.kind === "instamart" && (
          <>
            {p.option.items.length === 0 ? (
              <p className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-xs leading-relaxed text-amber-950/90">
                No cached Instamart SKUs matched this budget and city yet. Try a larger budget or
                re-seed cached products — the composer preview will fill once data is loaded.
              </p>
            ) : (
              <>
                {p.option.items.some((it) => it.image_url) ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                      In this hamper
                    </p>
                    <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {p.option.items.map((it) =>
                        it.image_url ? (
                          <div
                            key={it.item_id}
                            className="group/img relative h-[4.75rem] w-[4.75rem] shrink-0 overflow-hidden rounded-2xl border border-neutral-200/90 bg-neutral-50 shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]"
                          >
                            <Image
                              src={it.image_url}
                              alt={it.name}
                              title={it.name}
                              fill
                              className="object-cover transition duration-300 group-hover/img:scale-[1.03]"
                              sizes="76px"
                            />
                          </div>
                        ) : null,
                      )}
                    </div>
                  </div>
                ) : null}
                {p.option.description ? (
                  <p className="flex-1 text-sm leading-relaxed text-[var(--color-text)]">
                    {p.option.description}
                  </p>
                ) : null}
                <div className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-2.5 text-xs font-semibold text-[var(--color-text-muted)]">
                  <span>{p.option.items.length} items</span>
                  <span className="h-3 w-px bg-neutral-200" />
                  <span>₹{(p.option.estimated_total_paise / 100).toFixed(0)} est.</span>
                </div>
              </>
            )}
          </>
        )}
        {p.kind === "food" && (
          <>
            <p className="font-display text-3xl font-semibold tracking-tight text-[var(--color-accent)]">
              ₹{(p.option.amount_paise / 100).toLocaleString("en-IN")}
            </p>
            <p className="flex-1 text-sm leading-relaxed text-[var(--color-text)]">
              {p.option.description}
            </p>
          </>
        )}

        {showCta ? (
          <Button
            variant={highlight ? "default" : "outline"}
            className="mt-auto w-full gap-2"
            asChild
          >
            <Link
              href={p.href}
              onClick={() => {
                if ("onChoose" in p) p.onChoose?.();
              }}
            >
              Choose this
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        ) : (
          <div className="mt-auto flex min-h-10 items-center justify-center rounded-full border border-dashed border-[var(--color-border)] px-2 py-2 text-center text-[11px] font-medium leading-snug text-[var(--color-text-faint)]">
            Sender preview — recipients see full details after you send the gift link
          </div>
        )}
      </div>
    </div>
  );
}
