import type { ColumnMapping, FieldKey } from '../types'
import { FIELD_KEYS } from '../types'

/**
 * Palavras-chave usadas para reconhecer automaticamente qual coluna da
 * planilha corresponde a cada campo esperado. A busca é por "contém", então
 * plural/prefixos/sufixos (ex: "CPF do titular") também são reconhecidos.
 */
const FIELD_KEYWORDS: Record<FieldKey, string[]> = {
  operadora: ['operadora'],
  cpf: ['cpf'],
  plano: ['plano'],
  valor: ['valor', 'mensalidade', 'preco', 'preço'],
  fatura: ['fatura', 'nota fiscal', ' nf', 'nf '],
  carteirinha: ['carteirinha', 'carteira', 'matricula', 'matrícula'],
}

/**
 * Tenta adivinhar automaticamente o mapeamento de colunas de uma planilha,
 * comparando o nome de cada cabeçalho com as palavras-chave de cada campo.
 * Usada para pré-preencher a tela de mapeamento e poupar trabalho manual do
 * usuário — o resultado ainda pode (e deve) ser ajustado por ele antes de
 * comparar as planilhas.
 *
 * @param headers Lista de cabeçalhos de coluna lidos da planilha.
 * @returns Mapeamento campo -> nome do cabeçalho, com '' para campos não reconhecidos.
 */
export function guessMapping(headers: string[]): ColumnMapping {
  const mapping = {} as ColumnMapping
  for (const field of FIELD_KEYS) {
    const keywords = FIELD_KEYWORDS[field]
    const match = headers.find((header) => {
      const normalized = ` ${header.toLowerCase()} `
      return keywords.some((keyword) => normalized.includes(keyword))
    })
    mapping[field] = match ?? ''
  }
  return mapping
}
