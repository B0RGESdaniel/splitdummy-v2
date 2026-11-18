"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ReceiptItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
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
) {
  const sanitized = sanitizeItems(items);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  if (mode === "replace") {
    const { error: deleteError } = await supabase
      .from("items")
      .delete()
      .eq("bill_id", billId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  const { error: insertError } = await supabase.from("items").insert(
    sanitized.map((item) => ({
      bill_id: billId,
      description: item.description,
      unit_price: item.unit_price,
      quantity: item.quantity,
      created_by: userId,
    })),
  );

  if (insertError) {
    throw new Error(insertError.message);
  }

  const { error: receiptError } = await supabase
    .from("receipts")
    .update({ status: "reviewed" })
    .eq("id", receiptId);

  if (receiptError) {
    throw new Error(receiptError.message);
  }

  revalidatePath(`/bills/${billId}/items`);
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
