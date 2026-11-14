"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const TABS = [
  { segment: "items", label: "Itens" },
  { segment: "participants", label: "Participantes" },
  { segment: "summary", label: "Resumo" },
] as const;

export function BillTabs({ billId }: { billId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b">
      {TABS.map((tab) => {
        const href = `/bills/${billId}/${tab.segment}`;
        const active = pathname?.startsWith(href) ?? false;

        return (
          <Link
            key={tab.segment}
            href={href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
