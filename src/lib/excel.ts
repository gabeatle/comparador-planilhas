import type { WorkBook } from 'xlsx'
import type { CellValue, ParsedSheet } from '../types'

/**
 * Importa a biblioteca xlsx (SheetJS) sob demanda. Ela é pesada (~490KB, com
 * codecs para vários formatos de planilha), então só é baixada quando o
 * usuário realmente sobe ou exporta um arquivo — mantém o carregamento
 * inicial do app rápido em conexões móveis.
 */
async function loadXlsx() {
  return import('xlsx')
}

/**
 * Lê um arquivo .xls/.xlsx e devolve os dados da primeira aba já organizados
 * em cabeçalhos + linhas (cada linha é um objeto {cabeçalho: valor}).
 *
 * Assume que a primeira linha não-vazia da planilha é o cabeçalho. Colunas
 * sem nome viram "Coluna N"; cabeçalhos repetidos ganham um sufixo "(2)",
 * "(3)" etc. para não se sobrescreverem. Linhas totalmente vazias são
 * descartadas.
 *
 * @param file Arquivo selecionado pelo usuário (input type="file").
 * @throws Error se o arquivo não tiver nenhuma aba ou nenhuma linha de cabeçalho identificável.
 * @returns Nome do arquivo, lista de cabeçalhos e as linhas de dados.
 */
export async function readSpreadsheet(file: File): Promise<ParsedSheet> {
  const XLSX = await loadXlsx()
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('A planilha não contém nenhuma aba.')

  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json<CellValue[]>(sheet, { header: 1, defval: '' })

  const headerIndex = matrix.findIndex((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
  if (headerIndex === -1) {
    throw new Error('Não foi possível encontrar uma linha de cabeçalho na planilha.')
  }

  const headerRow = matrix[headerIndex]
  const seen = new Map<string, number>()
  const headers = headerRow.map((cell, index) => {
    const base = String(cell ?? '').trim() || `Coluna ${index + 1}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base} (${count + 1})`
  })

  const rows: Record<string, CellValue>[] = []
  for (const row of matrix.slice(headerIndex + 1)) {
    const isEmpty = row.every((cell) => String(cell ?? '').trim() === '')
    if (isEmpty) continue

    const record: Record<string, CellValue> = {}
    headers.forEach((header, index) => {
      record[header] = row[index]
    })
    rows.push(record)
  }

  return { fileName: file.name, headers, rows }
}

/**
 * Monta uma planilha (workbook) em memória a partir de uma ou mais listas de
 * objetos, uma aba por lista. Usada na exportação do resultado final
 * (abas "Resumo", "Ativos" e "Saídas").
 *
 * @param sheets Lista de {name, rows} — nome da aba e as linhas (cada linha é um objeto {coluna: valor}).
 * @returns O workbook pronto para ser baixado com `downloadWorkbook`.
 */
export async function buildWorkbook(sheets: { name: string; rows: Record<string, CellValue>[] }[]): Promise<WorkBook> {
  const XLSX = await loadXlsx()
  const workbook = XLSX.utils.book_new()
  for (const { name, rows } of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(rows)
    // Nomes de aba no Excel têm limite de 31 caracteres.
    XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31))
  }
  return workbook
}

/**
 * Dispara o download de um workbook no navegador, no formato escolhido pelo
 * usuário. 'xls' gera o formato binário antigo do Excel (BIFF8, compatível
 * com Excel 97-2004); 'xlsx' gera o formato moderno baseado em XML/zip.
 *
 * @param workbook Workbook montado por `buildWorkbook`.
 * @param fileName Nome do arquivo, sem extensão.
 * @param format Formato de exportação escolhido pelo usuário.
 */
export async function downloadWorkbook(workbook: WorkBook, fileName: string, format: 'xlsx' | 'xls'): Promise<void> {
  const XLSX = await loadXlsx()
  const bookType = format === 'xls' ? 'biff8' : 'xlsx'
  XLSX.writeFile(workbook, `${fileName}.${format}`, { bookType })
}
