import type { IdentityFieldDef, IdentityMapping } from '../types'

/**
 * Tenta adivinhar automaticamente quais colunas da planilha correspondem a
 * cada campo de identidade do perfil (CPF/carteirinha em Fatura, CPF/nome/
 * plano em Matriz etc.), comparando o nome de cada cabeçalho com as
 * palavras-chave de cada campo (`field.keywords`). Usada para pré-preencher
 * a tela de mapeamento — o resultado ainda pode (e deve) ser ajustado pelo
 * usuário antes de comparar as planilhas. Um cabeçalho já usado por outro
 * campo não é reaproveitado.
 *
 * @param headers Lista de cabeçalhos de coluna lidos da planilha.
 * @param identityFields Campos de identidade do perfil (Fatura, Matriz, etc.).
 * @returns Mapeamento campo de identidade -> nome do cabeçalho, com '' para campos não reconhecidos.
 */
export function guessIdentityMapping(headers: string[], identityFields: IdentityFieldDef[]): IdentityMapping {
  const mapping: IdentityMapping = {}
  for (const field of identityFields) {
    const match = headers.find((header) => {
      if (Object.values(mapping).includes(header)) return false
      const normalized = ` ${header.toLowerCase()} `
      return field.keywords.some((keyword) => normalized.includes(keyword))
    })
    mapping[field.key] = match ?? ''
  }
  return mapping
}

/** Remove acentos, espaços nas pontas e diferenças de caixa, para comparar nomes de cabeçalho por igualdade. */
export function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

