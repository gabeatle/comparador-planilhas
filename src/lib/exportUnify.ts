import type { UnifyField, UnifyRow } from '../types'
import { buildWorkbook, downloadWorkbook } from './excel'

/** Converte uma linha unificada no formato de objeto usado para escrever na planilha exportada. */
function toExportRow(row: UnifyRow, fields: UnifyField[]) {
  const columns: Record<string, string> = {}
  for (const field of fields) {
    columns[field.label] = row.values[field.id] ?? ''
  }

  return { 'Planilha de origem': row.sourceFileName, ...columns }
}

/**
 * Gera e baixa a planilha unificada, no formato escolhido pelo usuário
 * (.xlsx ou .xls). O arquivo final tem uma única aba ("Unificado") com todas
 * as linhas de todas as planilhas enviadas, na ordem em que foram enviadas.
 *
 * @param rows Linhas unificadas (ver `unifySheets` em lib/unify.ts).
 * @param fields Campos do resultado unificado, na ordem em que devem ser exportados.
 * @param format Formato de exportação escolhido pelo usuário.
 */
export async function exportUnified(rows: UnifyRow[], fields: UnifyField[], format: 'xlsx' | 'xls'): Promise<void> {
  const workbook = await buildWorkbook([{ name: 'Unificado', rows: rows.map((row) => toExportRow(row, fields)) }])
  await downloadWorkbook(workbook, 'planilhas-unificadas', format)
}
