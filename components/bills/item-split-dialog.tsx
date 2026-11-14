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
      <DialogContent container={portalContainer}>
        <DialogHeader>
          <DialogTitle className="font-handwritten text-2xl">
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
