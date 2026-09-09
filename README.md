# Comparador de Planilhas · Benefícios

Web app 100% client-side (sem backend, sem login) para comparar duas planilhas de
beneficiários de plano de saúde/vida/previdência mês a mês, apontando entradas,
saídas e alterações. Os dados nunca saem do navegador do usuário.

🔗 **[Acessar o app](https://gabeatle.github.io/comparador-planilhas/)**

## O que o app faz

O app tem duas seções de comparação independentes, uma embaixo da outra na mesma
página:

- **Comparador de Faturas** — identidade CPF + Nº da carteirinha.
- **Comparador de Matriz** — identidade CPF + Nometitular + Nomedependente + Plano.

Cada seção segue o mesmo fluxo:

1. **Upload** — sobe a planilha do mês anterior e a do mês atual (.xls ou .xlsx).
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

## Stack técnica

- **React 19 + TypeScript + Vite**
- **[SheetJS (xlsx)](https://sheetjs.com/)**, carregado a partir do CDN oficial
  (não do pacote `xlsx` do npm) e importado dinamicamente para não engordar o
  bundle inicial
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
