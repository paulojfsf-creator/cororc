# Coro Litúrgico 4.2 — Assistente e Folhetos A4

## Novidades da versão 4.2

- Assistente de preparação litúrgica e sugestões automáticas.
- Navegação simplificada: Início, Calendário, Programas, Cânticos, Pessoas, Histórico e Mais.
- Integração com pesquisa/links do Laudate.
- Editor de folheto antes da impressão.
- Letras editáveis por folheto, sem alterar a letra guardada no catálogo.
- Folheto A4 retrato com duas colunas.
- Logótipo do coro no canto superior esquerdo.
- Imagem da celebração no canto superior direito, usando a imagem carregada para o domingo.
- Título, autor e momento litúrgico de cada cântico.
- Opção para incluir/excluir cada cântico do folheto.
- Pré-visualização e impressão/PDF.
- Backup e restauro dos dados locais.
- Interface clean, tipografia simples e linhas retas.

> Nota: as letras provenientes de fontes online continuam a ser abertas na fonte original; o texto integral só é usado no folheto quando existe no catálogo/localStorage ou quando é introduzido/editado pelo utilizador.

---

## ✨ V4.3: FOLHETO A4 INTELIGENTE

- Duas colunas com divisão por blocos completos: um cântico nunca é partido entre colunas.
- Reordenação dos cânticos no editor através de ↑ / ↓.
- Título e autor editáveis apenas no folheto.
- Letras editáveis apenas para o folheto, sem alterar o catálogo.
- Escolha/substituição da imagem da celebração diretamente no editor.
- Aviso automático sobre densidade do conteúdo e redução tipográfica quando necessário.
- Cabeçalho A4 com logótipo e imagem da celebração.

---

# Coro Litúrgico 2.1 — revisão completa

Versão revista a partir da 2.0.

## Correções principais
- Corrigido o botão de modo claro/escuro.
- Corrigido o guardar do programa: o formulário já não recarrega a página e grava corretamente no histórico.
- Corrigido o carregamento de programas a partir do histórico/calendário.
- Corrigida a imagem do domingo (upload, pré-visualização e remoção).
- Corrigida a cor litúrgica no modelo interno do programa.
- Corrigida a normalização de “Acto/Ato Penitencial”, “Acção/Ação de Graças” e variantes de “piedade”.
- Corrigida a comparação inteligente dos tempos litúrgicos.
- Melhorada a correspondência do Salmo responsorial, privilegiando o refrão oficial quando disponível.
- Corrigido o Salmo de 06/09/2026 para “Não fecheis os vossos corações”, conforme o Secretariado Nacional de Liturgia.
- Evitadas duplicações no histórico de utilização dos cânticos quando um domingo é gravado novamente.
- As sugestões deixam de excluir o cântico que está atualmente selecionado na própria secção; continuam a evitar duplicações noutras secções do mesmo programa.
- Ativados os botões de atualização/importação CSV do catálogo.
- Parser CSV melhorado para campos com vírgulas e aspas.
- Ativados os botões de editar letra e vídeo/áudio das secções do programa.
- Ativados os folhetos “assembleia” e “sem letras”.
- Ativada a área de ensaios com geração de mensagem para WhatsApp e email.
- Ativadas as ações de limpar histórico e limpar folhetos.
- Ativada pesquisa local de partituras associadas ao catálogo.
- Melhorada a área de cânticos personalizados.

## Dados
- 229 cânticos no catálogo integrado.
- 42 programas históricos de 2026.
- Dados históricos preservados.
- As referências litúrgicas verificadas incluídas na aplicação permanecem limitadas às datas documentadas no projeto; o restante calendário deve ser tratado como dados de trabalho até revisão integral.

## Google Drive
A aplicação mantém os acessos às pastas do Google Drive, mas não pressupõe sincronização automática da pasta. A integração direta deverá ser acrescentada quando houver uma ligação autorizada ao Drive.


## Evolução 3.2
- Layout da página inicial aproximado ao novo desenho aprovado.
- Logotipo claro e transparente para o cabeçalho azul.
- Botão Novo programa abre uma janela com 4 opções.
- Sugestões do programa atualizam automaticamente ao mudar data, catálogo ou cânticos.
- Catálogo pode atualizar em segundo plano sem recarregar a página.
- Seleção no calendário abre programas existentes ou cria um novo para a celebração.
- Associação de letras por título + autor, com prioridade para a letra existente no catálogo.

## Evolução 3.3 — Letras online
- Integrada a pesquisa de letras online através do Laudate / canticos.pt.
- A pesquisa é feita por título + autor, com preferência por uma coluna `LaudateURL`/`CanticosURL` caso exista no catálogo.
- No editor de letra passou a existir uma área “Fonte online” com acesso direto à página encontrada.
- Cada cântico selecionado no programa mostra também um atalho `🌐 Procurar no Laudate`.
- O catálogo apresenta uma coluna própria para a fonte online da letra.
- As letras não são copiadas automaticamente do site externo para a base local; quando a letra for fornecida/importada pelo coro, continua a poder ser guardada localmente e usada nos folhetos.

## Evolução 3.4 — Integração Laudate reforçada
- O Laudate passa a ser a fonte online principal para pesquisa de letras, em vez de depender apenas de uma pesquisa Google.
- Foram associadas ligações diretas verificadas para vários cânticos frequentes do repertório.
- Quando não existe correspondência direta conhecida, a aplicação abre a pesquisa interna do canticos.pt e disponibiliza também uma pesquisa ampla no Google.
- O botão `🌐 Sugestões Laudate` abre automaticamente a página do domingo no Laudate para os Domingos do Tempo Comum, usando o número do domingo e o Ano litúrgico.
- O indicador junto a cada cântico distingue `📖` (ligação direta conhecida) de `🌐` (pesquisa online).
- Mantida a opção de guardar letras localmente para utilização nos folhetos.
- Corrigido o refrão oficial associado a 06/09/2026 para `Não fecheis os vossos corações`.

### Nota sobre letras
O Coro Litúrgico continua a não copiar automaticamente textos integrais de sites externos. A integração fornece a fonte e a navegação para a página original; o texto integral pode ser guardado na aplicação quando for fornecido pelo coro ou quando o uso desse conteúdo for autorizado.


## 3.5 — Visual clean / moderno
- Interface redesenhada com tipografia Inter, espaços mais generosos e hierarquia simples.
- Fundo claro, cartões discretos, bordas finas e sombras suaves.
- Navegação compacta e moderna, mantendo as funcionalidades existentes.
- Responsivo para computador e telemóvel.
- Mantida a integração Laudate da versão 3.4.
