import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackToItemsLink({ billId }: { billId: string }) {
  return (
    <Link
      href={`/bills/${billId}/items`}
      className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3" />
      Itens
    </Link>
  );
}
