-- Corrige o "erro de internet" ao entrar.
-- As contas criadas com foto de perfil guardavam a imagem dentro dos dados da
-- conta. Essa imagem viaja em CADA pedido à base de dados e torna o pedido tão
-- grande que é recusado. Este script remove a foto desses dados.
-- Executar uma vez no SQL Editor do Supabase (como proprietário).

update auth.users
set raw_user_meta_data = raw_user_meta_data - 'foto_perfil'
where raw_user_meta_data ? 'foto_perfil';

-- Confirmar: deve devolver 0
select count(*) as contas_com_foto_na_sessao
from auth.users
where raw_user_meta_data ? 'foto_perfil';
