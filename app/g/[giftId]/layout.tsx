import Link from "next/link";
import { SwiggyMCPBadge } from "@/components/SwiggyMCPBadge";

export default function GiftLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="sticky top-0 z-40 flex justify-end border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 py-4 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)]">
            GiftStack
          </Link>
          <SwiggyMCPBadge />
        </div>
      </header>
      {children}
    </div>
  );
}
