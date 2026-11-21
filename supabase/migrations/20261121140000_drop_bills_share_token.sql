-- O compartilhamento de conta paga virou imagem do cupom (gerada no servidor
-- a cada pedido, só pra participantes), não mais uma página pública por
-- token. `share_token` era gerado no fechamento e nunca foi lido por nada.
--
-- A função do gatilho vem primeiro: ela gravava a coluna ao fechar a conta,
-- e sem ela o fechamento quebraria.
create or replace function public.protect_bill_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'bills.owner_id cannot be changed';
  end if;

  if old.status = 'closed' then
    raise exception 'closed bills are immutable';
  end if;

  if new.status <> old.status then
    if (select auth.uid()) <> old.owner_id then
      raise exception 'only the bill owner can change its status';
    end if;
    if new.status = 'closed' then
      new.closed_at := now();
    end if;
  end if;

  return new;
end;
$$;

alter table public.bills drop column share_token;
