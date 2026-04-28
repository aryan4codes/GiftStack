import { SiteHeader } from "@/components/site-header";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="relative mx-auto min-h-[calc(100vh-4rem)] max-w-6xl px-4 py-10 sm:px-6">
        <div className="hero-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 opacity-60" />
        {children}
      </main>
    </>
  );
}
