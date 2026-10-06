# Comparador de Planilhas · Benefícios

Web app 100% client-side (sem backend, sem login) para comparar duas planilhas de
beneficiários de plano de saúde/vida/previdência mês a mês, apontando entradas,
saídas e alterações. Os dados nunca saem do navegador do usuário.

🔗 **[Acessar o app](https://gabeatle.github.io/comparador-planilhas/)**

## O que o app faz

O app tem quatro seções de comparação independentes, uma embaixo da outra na
mesma página:

- **Comparador de Faturas** — identidade CPF + Nº da carteirinha.
- **Comparador de Matriz** — identidade CPF + Nometitular + Nomedependente + Plano.
- **Comparador de PDF** — dois PDFs (mês anterior × mês atual), identidade CPF.
- **Conferência PDF × Planilha** — um PDF (ex: fatura da operadora) contra uma
  planilha (ex: matriz da empresa) do mesmo mês, identidade CPF. Em vez de
  entradas/saídas, mostra quem está **só no PDF**, **só na planilha** ou
  **divergente** (nos dois, com dados diferentes).

Cada seção segue o mesmo fluxo:

1. **Upload** — sobe os dois arquivos. Faturas e Matriz aceitam .xls, .xlsx ou
   .pdf com texto selecionável; as seções de PDF aceitam só o formato indicado
   em cada campo.
2. **Mapeamento** — confirma as colunas de identidade (auto-detectadas por
   palavra-chave) e marca, numa lista de checkboxes, quais outras colunas entram
   na comparação. Marcar uma coluna pareia automaticamente com a de mesmo nome
   na outra planilha.
3. **Resultado** — mostra entradas, saídas e alterações numa tabela filtrável
   (Todos/Entradas/Saídas/Alterados), com exportação em .xlsx ou .xls (abas
   Resumo, Todos, Entradas, Saídas, Alterados). Quando as duas seções chegam
   nesse passo ao mesmo tempo, o resultado das duas aparece lado a lado, para
   não confundir qual tabela é de qual planilha.

Linhas com problema (CPF vazio/inválido, campo de identidade vazio, chave
duplicada na mesma planilha) são sinalizadas na tabela, mas nunca bloqueiam o
processamento.

### PDFs

- **Leitura de PDF** — o Comparador e o Unificador também aceitam PDF gerado por
  sistema (não escaneado). A tabela é reconstruída pela posição do texto: o
  cabeçalho é a linha com mais títulos de coluna (de preferência com CPF, Nome,
  Plano…), cada valor vai para a coluna sobre a qual está, e o cabeçalho
  repetido, o topo das páginas seguintes e os rodapés são ignorados. Cabeçalhos
  ou células quebrados em duas linhas ficam só com a primeira linha.
- **Juntar PDFs** — seção separada que mescla vários PDFs num arquivo só, na
  ordem escolhida pelo usuário.

## Stack técnica

- **React 19 + TypeScript + Vite**
- **[SheetJS (xlsx)](https://sheetjs.com/)**, carregado a partir do CDN oficial
  (não do pacote `xlsx` do npm) e importado dinamicamente para não engordar o
  bundle inicial
- **[pdf.js](https://mozilla.github.io/pdf.js/)** para ler o texto dos PDFs e
  **[pdf-lib](https://pdf-lib.js.org/)** para juntá-los, ambos também carregados
  sob demanda
- Tema claro/escuro com preferência salva no navegador

## Rodando localmente

```bash
npm install
npm run dev       # servidor de desenvolvimento
npm run build     # build de produção (roda o type-check antes)
npm run lint       # oxlint
```

## Deploy

Publicado no GitHub Pages via GitHub Actions
(`.github/workflows/deploy.yml`), que builda e publica automaticamente a cada
push na branch `main`. Não é necessário nenhum passo manual de deploy.
