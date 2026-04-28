import { Utensils } from "lucide-react";

export function SwiggyMCPBadge() {
  return (
    <a
      href="https://mcp.swiggy.com/builders"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full bg-[#FC8019] px-3 py-1 text-xs font-medium text-white hover:bg-[#e5701a] transition-colors"
    >
      <Utensils className="h-3 w-3" aria-hidden />
      Powered by Swiggy MCP
    </a>
  );
}
