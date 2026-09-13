# Coro Litúrgico 6.1 — Biblioteca Musical + Assistente Litúrgico

Evolução da versão 6.0 com foco na biblioteca musical e na hierarquia de validação litúrgica.

## Alterações 6.1
- A biblioteca passa a expor Momento, Celebração, Salmo, Autor e recursos de partitura/vídeo quando esses metadados existem no catálogo local.
- O Assistente mostra o Salmo oficial resolvido pela liturgia antes das sugestões.
- O ranking dá prioridade a associação litúrgica explícita, ciclo e momento; o histórico só ordena candidatos que já passaram pelo filtro litúrgico.
- Foram mantidas ligações diretas para Cantoral Nacional, Laudate e O Canto na Liturgia.
- Natal mantém as associações verificadas: Noite — Sl 95 (96); Aurora — Sl 96 (97); Dia — Sl 97 (98).
- Não há sincronização automática com Google Drive/Google Sheets. O catálogo continua a poder ser carregado localmente.

## Fontes litúrgicas
- Secretariado Nacional de Liturgia: https://www.liturgia.pt/
- Cantoral Nacional Ano A: https://www.liturgia.pt/musica/cantoralA.php
- Cantoral Nacional Ano B: https://www.liturgia.pt/musica/cantoralB.php
- Cantoral Nacional Ano C: https://www.liturgia.pt/musica/cantoralC.php
- Laudate: https://www.canticos.pt/
- O Canto na Liturgia: https://ocantonaliturgia.pt/obras

## Limitação importante
A aplicação é estática. As páginas externas são apresentadas como fontes de consulta; a aplicação não faz scraping automático das letras ou partituras externas.
