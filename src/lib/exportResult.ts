import type { ComparisonField, ComparisonResult, ComparisonRow, IdentityFieldDef } from '../types'
import { ISSUE_LABELS, STATUS_LABELS } from '../types'
import { buildWorkbook, downloadWorkbook } from './excel'

/**
 * Converte uma linha de resultado no formato de objeto usado para escrever
 * na planilha exportada (uma chave por coluna, com os nomes de coluna que
 * aparecem no Excel). As colunas de identidade e de comparação usam o
 * rótulo escolhido pelo usuário — a tela de mapeamento não deixa escolher a
 * mesma coluna em duas linhas, então não há colisão de chave aqui.
 *
 * @param row Linha de resultado (entrada, saída, alterado ou permanece).
 * @param identityFields Campos de identidade usados nesta rodada, na ordem de exportação.
 * @param fields Campos de comparação usados nesta rodada, na ordem de exportação.
 * @returns Objeto pronto para virar uma linha de planilha via SheetJS.
 */
function toExportRow(row: ComparisonRow, identityFields: IdentityFieldDef[], fields: ComparisonField[]) {
  const identityColumns: Record<string, string> = {}
  for (const field of identityFields) {
    identityColumns[field.label] = row.identity[field.key] ?? ''
  }

  const fieldColumns: Record<string, string> = {}
  for (const field of fields) {
    fieldColumns[field.label] = row.values[field.id] ?? ''
  }

  return {
    Status: STATUS_LABELS[row.status],
    ...identityColumns,
    ...fieldColumns,
    Alterações: row.changes.map((change) => `${change.label}: ${change.before} → ${change.after}`).join('; '),
    Atenção: row.issues.map((issue) => ISSUE_LABELS[issue]).join('; '),
  }
}

/**
 * Gera e baixa a planilha final com o resultado da comparação, no formato
 * escolhido pelo usuário (.xlsx ou .xls). O arquivo final tem uma aba por
 * indicador ("Resumo") mais uma aba para cada um dos filtros exibidos na
 * tela de resultado, na mesma ordem: "Todos", "Entradas", "Saídas" e
 * "Alterados".
 *
 * @param result Resultado da comparação (linhas classificadas + resumo).
 * @param format Formato de exportação escolhido pelo usuário.
 * @param filenamePrefix Prefixo do nome do arquivo baixado (ex: "fatura", "matriz"), para não colidir entre perfis.
 */
export async function exportComparison(
  result: ComparisonResult,
  format: 'xlsx' | 'xls',
  filenamePrefix: string,
): Promise<void> {
  const entradas = result.rows.filter((row) => row.status === 'entrada')
  const saidas = result.rows.filter((row) => row.status === 'saida')
  const alterados = result.rows.filter((row) => row.status === 'alterado')

  const resumo = [
    { Indicador: 'Entradas', Quantidade: result.summary.entradas },
    { Indicador: 'Saídas', Quantidade: result.summary.saidas },
    { Indicador: 'Alterados', Quantidade: result.summary.alterados },
    { Indicador: 'Permanecem sem alteração', Quantidade: result.summary.permanecem },
    { Indicador: 'Total de ativos no mês', Quantidade: result.summary.totalAtivos },
  ]

  /** Atalho que já fixa os campos de identidade/comparação desta rodada, para usar em `.map()` abaixo. */
  const toRow = (row: ComparisonRow) => toExportRow(row, result.identityFields, result.fields)

  const workbook = await buildWorkbook([
    { name: 'Resumo', rows: resumo },
    { name: 'Todos', rows: result.rows.map(toRow) },
    { name: 'Entradas', rows: entradas.map(toRow) },
    { name: 'Saídas', rows: saidas.map(toRow) },
    { name: 'Alterados', rows: alterados.map(toRow) },
  ])

  await downloadWorkbook(workbook, `${filenamePrefix}-atualizada`, format)
}
