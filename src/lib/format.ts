import type { CellValue } from '../types'

/**
 * Converte o valor bruto de uma célula (string, número, data ou vazio) para
 * o texto que deve aparecer na tela e na planilha exportada.
 * Números são formatados como "1.234,56" (padrão brasileiro) e datas como
 * "dd/mm/aaaa"; o resto é apenas convertido para string e aparado.
 *
 * @param value Valor bruto vindo da leitura da planilha (via SheetJS).
 * @returns Texto pronto para exibição, ou string vazia se não houver valor.
 */
export function cellToDisplay(value: CellValue): string {
  if (value === undefined || value === null || value === '') return ''
  if (value instanceof Date) return value.toLocaleDateString('pt-BR')
  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return String(value).trim()
}

/**
 * Converte o valor bruto de uma célula para número, para permitir comparação
 * numérica (usado principalmente no campo "Valor" ao detectar alterações).
 * Aceita tanto número já pronto (vindo do Excel) quanto texto em formato
 * brasileiro ("1.234,56") ou internacional ("1234.56"), inclusive com
 * símbolos como "R$" na frente, que são descartados.
 *
 * @param value Valor bruto vindo da leitura da planilha.
 * @returns O número interpretado, ou null se não for possível converter.
 */
export function cellToNumber(value: CellValue): number | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number') return value
  if (value instanceof Date) return null

  const trimmed = String(value).replace(/[^\d,.-]/g, '').trim()
  if (!trimmed) return null

  let normalized = trimmed
  if (normalized.includes(',') && normalized.includes('.')) {
    // Ex: "1.234,56" -> remove separador de milhar e troca vírgula decimal por ponto.
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  } else if (normalized.includes(',')) {
    // Ex: "1234,56" -> só troca a vírgula decimal por ponto.
    normalized = normalized.replace(',', '.')
  }

  const parsed = Number.parseFloat(normalized)
  return Number.isNaN(parsed) ? null : parsed
}
