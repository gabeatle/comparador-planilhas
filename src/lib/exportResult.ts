import type { ComparisonResult, ComparisonRow } from '../types'
import { FIELD_LABELS, ISSUE_LABELS, STATUS_LABELS } from '../types'
import { buildWorkbook, downloadWorkbook } from './excel'

/**
 * Converte uma linha de resultado no formato de objeto usado para escrever
 * na planilha exportada (uma chave por coluna, com os nomes de coluna que
 * aparecem no Excel).
 *
 * @param row Linha de resultado (entrada, saída, alterado ou permanece).
 * @returns Objeto pronto para virar uma linha de planilha via SheetJS.
 */
function toExportRow(row: ComparisonRow) {
  return {
    Status: STATUS_LABELS[row.status],
    Operadora: row.operadora,
    CPF: row.cpfDisplay,
    Plano: row.plano,
    Valor: row.valorDisplay,
    Fatura: row.fatura,
    'Nº da carteirinha': row.carteirinha,
    Alterações: row.changes.map((change) => `${FIELD_LABELS[change.field]}: ${change.before} → ${change.after}`).join('; '),
    Atenção: row.issues.map((issue) => ISSUE_LABELS[issue]).join('; '),
  }
}

/**
 * Gera e baixa a planilha final com o resultado da comparação, no formato
 * escolhido pelo usuário (.xlsx ou .xls). O arquivo final tem 3 abas:
 *
 * - "Resumo": contagem de entradas, saídas, alterados e total de ativos.
 * - "Ativos": todo mundo que continua ativo no mês atual (entrada, alterado
 *   e permanece), com uma coluna de Status indicando o que aconteceu.
 * - "Saídas": só quem deixou de aparecer na planilha do mês atual.
 *
 * @param result Resultado da comparação (linhas classificadas + resumo).
 * @param format Formato de exportação escolhido pelo usuário.
 */
export async function exportComparison(result: ComparisonResult, format: 'xlsx' | 'xls'): Promise<void> {
  const ativos = result.rows.filter((row) => row.status !== 'saida')
  const saidas = result.rows.filter((row) => row.status === 'saida')

  const resumo = [
    { Indicador: 'Entradas', Quantidade: result.summary.entradas },
    { Indicador: 'Saídas', Quantidade: result.summary.saidas },
    { Indicador: 'Alterados', Quantidade: result.summary.alterados },
    { Indicador: 'Permanecem sem alteração', Quantidade: result.summary.permanecem },
    { Indicador: 'Total de ativos no mês', Quantidade: result.summary.totalAtivos },
  ]

  const workbook = await buildWorkbook([
    { name: 'Resumo', rows: resumo },
    { name: 'Ativos', rows: ativos.map(toExportRow) },
    { name: 'Saídas', rows: saidas.map(toExportRow) },
  ])

  await downloadWorkbook(workbook, 'planilha-atualizada', format)
}
