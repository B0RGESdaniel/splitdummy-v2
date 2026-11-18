-- Modos de divisão percent/fixed saíram do escopo do produto: item_shares
-- passa a guardar só partes. Remove as colunas share_type/percent/fixed_amount,
-- o check que amarrava um valor por modo e o trigger que validava as somas
-- de percent/fixed entre linhas irmãs (sem nada a validar pra partes).

drop trigger trg_validate_item_share on public.item_shares;
drop function public.validate_item_share ();

alter table public.item_shares
  drop constraint item_shares_one_value_per_type;

alter table public.item_shares
  drop column share_type,
  drop column percent,
  drop column fixed_amount;

-- Antes o "parts is not null" vinha do check acima (share_type = 'parts');
-- sem ele, vira not null direto na coluna.
alter table public.item_shares
  alter column parts set not null;
