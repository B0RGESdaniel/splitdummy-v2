-- Grupos recorrentes saíram do escopo: com convidados sem conta (Bloco A),
-- um grupo restrito a perfis com conta deixava de fora o caso mais comum.
-- Substituído por "importar participantes de uma conta anterior", que não
-- precisa de tabela própria. As policies caem junto com as tabelas.

drop table public.group_members;
drop table public.groups;
