import { Utensils } from "lucide-react";

export function SwiggyMCPBadge() {
  return (
    <a
      href="https://mcp.swiggy.com/builders"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-[#FC8019] px-3 py-1 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(252,128,25,0.24)] transition-colors hover:bg-[#e5701a]"
    >
      <Utensils className="h-3 w-3" aria-hidden />
      Powered by Swiggy MCP
    </a>
  );
}
