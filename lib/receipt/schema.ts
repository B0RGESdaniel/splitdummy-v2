import { z } from "zod";

export const extractedReceiptItemSchema = z.object({
  description: z
    .string()
    .min(1)
    .describe("Nome curto do item, como num cardápio, em Capitalize, com no máximo 24 caracteres"),
  quantity: z.number().positive().describe("Quantidade do item"),
  unitPrice: z.number().nonnegative().describe("Preço unitário em reais (R$)"),
});

export const extractedReceiptSchema = z.object({
  items: z.array(extractedReceiptItemSchema).max(50),
});

export type ExtractedReceiptItem = z.infer<typeof extractedReceiptItemSchema>;
export type ExtractedReceipt = z.infer<typeof extractedReceiptSchema>;
