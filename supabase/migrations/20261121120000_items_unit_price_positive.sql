-- Item precisa de valor: não existe item de R$ 0 na conta (não há o que
-- dividir). Formulário, actions e revisão do cupom já recusam zero; o check
-- garante no banco. Nenhuma linha com unit_price = 0 existia ao aplicar.
alter table public.items drop constraint items_unit_price_check;
alter table public.items add constraint items_unit_price_check check (unit_price > 0);
