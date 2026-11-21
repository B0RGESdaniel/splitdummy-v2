-- Perfil guarda só o primeiro nome: é o que cabe na mesa, na grade "Dono" e
-- no cupom sem quebrar o layout. Vale pro nome que vem do Google e pro que a
-- pessoa digita no primeiro acesso.
--
-- Login por e-mail não traz nome nenhum: o perfil nasce com nome vazio e a
-- tela de primeiro acesso pede o nome (antes caía no pedaço do e-mail antes
-- do "@", que aparecia na mesa como "dlopesborges").
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    split_part(
      btrim(coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name',
        ''
      )),
      ' ',
      1
    ),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

update public.profiles
set display_name = split_part(btrim(display_name), ' ', 1)
where btrim(display_name) like '% %';
