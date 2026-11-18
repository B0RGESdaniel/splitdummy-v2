import { NextResponse, type NextRequest } from "next/server";
import { generateText, Output } from "ai";

import { createClient } from "@/lib/supabase/server";
import { extractedReceiptSchema } from "@/lib/receipt/schema";

const EXTRACTION_MODEL = "google/gemini-2.5-flash-lite";

const EXTRACTION_PROMPT = `Você está lendo a foto de um cupom fiscal de bar ou restaurante brasileiro.

Extraia cada item consumido como uma linha, com: descrição (como aparece no cupom), quantidade, e preço unitário em reais (R$).

Regras:
- Ignore linhas de subtotal, total, taxa de serviço, troco, forma de pagamento, CNPJ e outros dados fiscais — só itens consumidos.
- Se um item for vendido por peso (kg) em vez de unidade, use quantity: 1 e unitPrice como o valor total daquele item.
- Se a mesma descrição aparecer em mais de uma linha do cupom, mantenha como linhas separadas — não some.
- Se não conseguir ler a foto com confiança (borrada, cortada, iluminação ruim, ou não é um cupom fiscal), retorne items como uma lista vazia em vez de inventar valores.`;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const billId = String(formData.get("billId") ?? "");
  const photo = formData.get("photo");

  if (!billId || !(photo instanceof File)) {
    return NextResponse.json(
      { error: "Envie uma foto e o id da conta." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const [{ data: bill }, { data: participant }] = await Promise.all([
    supabase.from("bills").select("status").eq("id", billId).single(),
    supabase
      .from("bill_participants")
      .select("id")
      .eq("bill_id", billId)
      .eq("profile_id", userId)
      .maybeSingle(),
  ]);

  if (!bill || bill.status !== "open" || !participant) {
    return NextResponse.json(
      { error: "Conta não encontrada, fechada, ou você não participa dela." },
      { status: 403 },
    );
  }

  const buffer = Buffer.from(await photo.arrayBuffer());

  try {
    const { output } = await generateText({
      model: EXTRACTION_MODEL,
      reasoning: "none",
      output: Output.object({ schema: extractedReceiptSchema }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACTION_PROMPT },
            {
              type: "file",
              mediaType: photo.type || "image/jpeg",
              data: buffer,
            },
          ],
        },
      ],
    });

    const { data: receipt, error: insertError } = await supabase
      .from("receipts")
      .insert({
        bill_id: billId,
        uploaded_by: userId,
        ai_raw_result: output,
        ai_model: EXTRACTION_MODEL,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !receipt) {
      return NextResponse.json(
        { error: "Itens extraídos, mas não deu pra salvar o registro de auditoria." },
        { status: 500 },
      );
    }

    return NextResponse.json({ receiptId: receipt.id, items: output.items });
  } catch (error) {
    console.error("extract-receipt: falha na extração", error);
    return NextResponse.json(
      {
        error:
          "Não consegui ler essa foto. Tente outra, bem iluminada e sem cortar o cupom.",
      },
      { status: 422 },
    );
  }
}
