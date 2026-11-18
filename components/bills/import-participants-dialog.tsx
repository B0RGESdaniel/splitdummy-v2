"use client";

import { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, History } from "lucide-react";
import { toast } from "sonner";

import { AvatarIcon, type AvatarKey } from "@/components/bills/avatar-icon";
import { usePortalContainer } from "@/components/theme-scope";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

type SourcePerson = {
  id: string;
  name: string;
  avatarKey: AvatarKey | null;
  alreadyHere: boolean;
};

type SourceBill = {
  id: string;
  name: string;
  createdAt: string;
  people: SourcePerson[];
};

function normalizeName(name: string) {
  return name.toLocaleLowerCase("pt-BR");
}

export function ImportParticipantsDialog({
  billId,
  ownerId,
  currentProfileIds,
  currentNames,
  action,
}: {
  billId: string;
  ownerId: string;
  currentProfileIds: string[];
  currentNames: string[];
  action: (
    sourceBillId: string,
    sourceParticipantIds: string[],
  ) => Promise<{ imported: number }>;
}) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<SourceBill | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const portalContainer = usePortalContainer();

  const { data: bills, isPending } = useQuery({
    queryKey: ["import-sources", billId],
    enabled: open,
    queryFn: async (): Promise<SourceBill[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("bills")
        .select(
          "id, name, created_at, bill_participants(id, profile_id, display_name, avatar_key, joined_at, profiles(display_name, avatar_key))",
        )
        .eq("owner_id", ownerId)
        .neq("id", billId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const profileIds = new Set(currentProfileIds);
      const names = new Set(currentNames.map(normalizeName));

      return (data ?? []).flatMap((bill) => {
        const people = [...bill.bill_participants]
          .filter((row) => row.profile_id !== ownerId)
          .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
          .map((row) => {
            const name = (
              row.display_name ??
              row.profiles?.display_name ??
              ""
            ).trim();
            return {
              id: row.id,
              name,
              avatarKey: (row.avatar_key ??
                row.profiles?.avatar_key ??
                null) as AvatarKey | null,
              alreadyHere:
                (!!row.profile_id && profileIds.has(row.profile_id)) ||
                names.has(normalizeName(name)),
            };
          })
          .filter((person) => person.name);

        if (people.length === 0) return [];
        return [
          { id: bill.id, name: bill.name, createdAt: bill.created_at, people },
        ];
      });
    },
  });

  function pickSource(bill: SourceBill) {
    setSource(bill);
    setSelected(
      new Set(
        bill.people
          .filter((person) => !person.alreadyHere)
          .map((person) => person.id),
      ),
    );
  }

  function toggle(personId: string, checked: boolean) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (checked) next.add(personId);
      else next.delete(personId);
      return next;
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSource(null);
      setSelected(new Set());
    }
  }

  function submit() {
    if (!source) return;
    startTransition(async () => {
      try {
        const { imported } = await action(source.id, [...selected]);
        toast.success(
          imported === 1
            ? "1 pessoa importada."
            : `${imported} pessoas importadas.`,
        );
        handleOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível importar os participantes.",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <History data-icon="inline-start" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent container={portalContainer}>
        <DialogHeader>
          <DialogTitle>
            {source ? source.name : "Importar de outra conta"}
          </DialogTitle>
        </DialogHeader>

        {!source ? (
          isPending ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !bills || bills.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma outra conta sua com participantes.
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col overflow-y-auto">
              {bills.map((bill) => (
                <li key={bill.id} className="border-b border-foreground/30">
                  <button
                    type="button"
                    onClick={() => pickSource(bill)}
                    className="flex w-full items-baseline justify-between gap-3 py-2.5 text-left"
                  >
                    <span className="truncate font-semibold">{bill.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(bill.createdAt).toLocaleDateString("pt-BR")} ·{" "}
                      {bill.people.length}{" "}
                      {bill.people.length === 1 ? "pessoa" : "pessoas"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setSource(null)}
              className="flex items-center gap-1 self-start text-xs font-medium text-muted-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Outras contas
            </button>
            <ul className="flex max-h-80 flex-col overflow-y-auto">
              {source.people.map((person) => (
                <li key={person.id}>
                  <label
                    className={`flex items-center gap-3 py-2 ${
                      person.alreadyHere ? "opacity-50" : ""
                    }`}
                  >
                    <Checkbox
                      checked={selected.has(person.id)}
                      disabled={person.alreadyHere}
                      onCheckedChange={(checked) =>
                        toggle(person.id, checked === true)
                      }
                    />
                    {person.avatarKey ? (
                      <AvatarIcon
                        avatarKey={person.avatarKey}
                        className="h-7 w-7 text-foreground"
                      />
                    ) : (
                      <span className="h-7 w-7 border-[1.5px] border-dashed border-foreground opacity-40" />
                    )}
                    <span className="truncate font-semibold">{person.name}</span>
                    {person.alreadyHere && (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        já na mesa
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              onClick={submit}
              disabled={pending || selected.size === 0}
              className="w-full"
            >
              {pending ? "Importando..." : `Importar ${selected.size}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
