import type { Metadata } from "next";
import Link from "next/link";

import { BalcaoSheet } from "@/components/auth/balcao-sheet";

export const metadata: Metadata = {
  title: "Política de Privacidade · Divide/ai",
};

const CONTACT_EMAIL = "dlopesborges@gmail.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase">{title}</h2>
      {children}
    </section>
  );
}

// Pública (sem login): exigida pelo Google pra publicar o login com Google.
export default function PrivacyPage() {
  return (
    <BalcaoSheet label="Política de Privacidade">
      <div className="flex flex-col gap-5 text-sm leading-relaxed">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-[0.08em] uppercase" aria-hidden>
            Política de Privacidade
          </span>
          <p>Atualizada em 21 de novembro de 2026.</p>
        </div>

        <p>
          O Divide/ai é um app para dividir a conta do bar ou restaurante entre as pessoas da
          mesa. É o trabalho de conclusão de curso de Daniel Borges (Sistemas de Informação), sem
          fins comerciais.
        </p>

        <Section title="O que guardamos">
          <ul className="flex list-disc flex-col gap-1 pl-5 normal-case">
            <li>
              Ao entrar com o Google: seu e-mail, seu primeiro nome e o endereço da sua foto de
              perfil. Ao entrar por e-mail: só o e-mail.
            </li>
            <li>O nome e o avatar que você escolhe para aparecer na mesa.</li>
            <li>
              As contas que você cria ou de que participa: nome da conta, itens, valores, taxa de
              serviço, quem participa e como cada item foi dividido. Isso inclui o nome de pessoas
              sem cadastro que o organizador põe na mesa.
            </li>
            <li>
              Da leitura do cupom fiscal, só os itens e valores extraídos, para conferência. A foto
              do cupom nunca é guardada.
            </li>
          </ul>
        </Section>

        <Section title="Para que usamos">
          <p>
            Só para o app funcionar: identificar você, mostrar as contas de que você participa e
            calcular quanto cada um deve. Não vendemos nem compartilhamos seus dados com
            anunciantes, e o app não tem publicidade nem rastreamento. O único cookie é o da sua
            sessão de login.
          </p>
        </Section>

        <Section title="Quem vê seus dados">
          <p>
            As pessoas que participam de uma mesma conta veem o nome, o avatar, os itens e os
            valores dessa conta. Ninguém vê as contas de que você não participa.
          </p>
        </Section>

        <Section title="Serviços usados">
          <p>
            Os dados ficam no Supabase (banco de dados e login) e o app é hospedado na Vercel. A
            foto do cupom é enviada, sem ser guardada, para leitura por IA (Google Gemini, pelo AI
            Gateway da Vercel). Os e-mails de login são enviados pelo Gmail.
          </p>
        </Section>

        <Section title="Seus direitos">
          <p>
            Você pode pedir para ver, corrigir ou apagar seus dados a qualquer momento, conforme a
            LGPD. Escreva para{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-[3px]">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Link href="/login" className="self-start text-[11px] font-semibold tracking-wide uppercase underline underline-offset-[3px]">
          Voltar para o login
        </Link>
      </div>
    </BalcaoSheet>
  );
}
