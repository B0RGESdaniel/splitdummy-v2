"use client";

import { ItemSplit } from "@/components/bills/item-split";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePortalContainer } from "@/components/theme-scope";
import { itemTotalCents } from "@/lib/split/calculate";

export function ItemSplitDialog({
  billId,
  item,
  isOpen,
  participants,
  trigger,
}: {
  billId: string;
  item: { id: string; description: string; unit_price: number; quantity: number };
  isOpen: boolean;
  participants: { participant_id: string; display_name: string | undefined }[];
  trigger: React.ReactNode;
}) {
  const portalContainer = usePortalContainer();

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {/* flex-col + max-h: só a lista de participantes rola (ver ItemSplit), título e ações ficam visíveis */}
      <DialogContent
        container={portalContainer}
        className="flex max-h-[min(calc(100dvh-2rem),32rem)] flex-col"
      >
        <DialogHeader>
          <DialogTitle className="font-handwritten text-2xl text-[color:var(--ink-handwritten)]">
            {item.description}
          </DialogTitle>
        </DialogHeader>
        <ItemSplit
          billId={billId}
          itemId={item.id}
          totalCents={itemTotalCents({
            quantity: item.quantity,
            unitPrice: item.unit_price,
          })}
          isOpen={isOpen}
          participants={participants}
        />
      </DialogContent>
    </Dialog>
  );
}
