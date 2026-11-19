"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ReceiptItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type SavedReceiptItem = {
  id: string;
  description: string;
  unit_price: number;
  quantity: number;
};

function sanitizeItems(items: ReceiptItemInput[]) {
  const sanitized = items
    .map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unit_price: Number(item.unitPrice),
    }))
    .filter(
      (item) =>
        item.description.length > 0 &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0 &&
        Number.isFinite(item.unit_price) &&
        item.unit_price >= 0,
    );

  if (sanitized.length === 0) {
    throw new Error("Nenhum item válido pra salvar.");
  }

  return sanitized;
}

export async function confirmReceiptItems(
  billId: string,
  receiptId: string,
  items: ReceiptItemInput[],
  mode: "append" | "replace",
): Promise<SavedReceiptItem[]> {
  const sanitized = sanitizeItems(items);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  // Apagar (no "substituir"), inserir e marcar o cupom como revisado numa
  // transação só, pra que o realtime nunca entregue um estado intermediário
  // da lista (ver migration `confirm_receipt_items_function`).
  const { data: inserted, error } = await supabase.rpc("confirm_receipt_items", {
    p_bill_id: billId,
    p_receipt_id: receiptId,
    p_items: sanitized,
    p_replace: mode === "replace",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}/items`);

  // Quem salvou escreve a lista final direto no cache, sem esperar o eco do
  // realtime.
  return inserted.map(({ id, description, unit_price, quantity }) => ({
    id,
    description,
    unit_price,
    quantity,
  }));
}

export async function discardReceipt(billId: string, receiptId: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("receipts")
    .update({ status: "discarded" })
    .eq("id", receiptId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/bills/${billId}/items`);
}
