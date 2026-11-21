import { z } from "zod";

import { MAX_ITEM_DESCRIPTION_LENGTH } from "@/lib/bill/item-description";

export const extractedReceiptItemSchema = z.object({
  description: z
    .string()
    .min(1)
    .describe(
      `Nome curto do item, como num cardápio, em Capitalize, com no máximo ${MAX_ITEM_DESCRIPTION_LENGTH} caracteres`,
    ),
  quantity: z.number().positive().describe("Quantidade do item"),
  unitPrice: z.number().nonnegative().describe("Preço unitário em reais (R$)"),
});

export const extractedReceiptSchema = z.object({
  items: z.array(extractedReceiptItemSchema).max(50),
});

export type ExtractedReceiptItem = z.infer<typeof extractedReceiptItemSchema>;
export type ExtractedReceipt = z.infer<typeof extractedReceiptSchema>;
