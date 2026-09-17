import type { LoadedFile, ParsedSheet, UnifyField, UnifyRow } from '../types'
import { cellToDisplay } from './format'
import { normalizeHeader } from './mapping'

/** Uma planilha enviada ao Unificador, identificada pelo id do seu slot de upload. */
export interface UnifySource {
  id: string
  sheet: ParsedSheet
}

/** Um slot de upload do Unificador, associado a um id estável (não muda enquanto o slot existir). */
export interface UnifySlot {
  id: string
  loaded: LoadedFile | null
}

let slotIdCounter = 0

/** Cria um slot de upload vazio, com um id único e estável para referenciar no mapeamento de colunas. */
export function createUnifySlot(): UnifySlot {
  return { id: `unify-slot-${slotIdCounter++}`, loaded: null }
}

let unifyFieldIdCounter = 0

/**
 * Sugere os campos do resultado unificado a partir dos cabeçalhos de todas
 * as planilhas enviadas: colunas com o mesmo nome (ignorando acento/caixa/
 * espaço) em planilhas diferentes viram um único campo, já casado nas duas.
 * Usada para pré-preencher a tela de mapeamento — o resultado ainda pode
 * (e deve) ser ajustado manualmente pelo usuário antes de unificar.
 *
 * @param sources Planilhas enviadas.
 * @returns Lista de campos sugeridos, na ordem em que os cabeçalhos apareceram.
 */
export function guessUnifyFields(sources: UnifySource[]): UnifyField[] {
  const fields: UnifyField[] = []
  const byNormalizedHeader = new Map<string, UnifyField>()

  for (const source of sources) {
    for (const header of source.sheet.headers) {
      const normalized = normalizeHeader(header)
      let field = byNormalizedHeader.get(normalized)
      if (!field) {
        field = { id: `unify-field-${unifyFieldIdCounter++}`, label: header, columnBySource: {} }
        byNormalizedHeader.set(normalized, field)
        fields.push(field)
      }
      field.columnBySource[source.id] = header
    }
  }

  return fields
}

/**
 * Empilha as linhas de todas as planilhas enviadas numa lista só, aplicando
 * o mapeamento de colunas definido pelo usuário. Uma coluna que não exista
 * numa planilha fica em branco nessa linha. Cada linha guarda o nome do
 * arquivo de origem, para diferenciar de onde ela veio depois de unificada.
 *
 * @param sources Planilhas enviadas.
 * @param fields Campos do resultado unificado, com o mapeamento de coluna por planilha.
 * @returns As linhas unificadas, na ordem das planilhas enviadas.
 */
export function unifySheets(sources: UnifySource[], fields: UnifyField[]): UnifyRow[] {
  const rows: UnifyRow[] = []

  for (const source of sources) {
    for (const row of source.sheet.rows) {
      const values: Record<string, string> = {}
      for (const field of fields) {
        const column = field.columnBySource[source.id]
        values[field.id] = column ? cellToDisplay(row[column]) : ''
      }
      rows.push({ sourceFileName: source.sheet.fileName, values })
    }
  }

  return rows
}
