/**
 * Remove tudo que não é dígito de um CPF (pontos, traço, espaços).
 * Usado antes de validar ou comparar CPFs, já que o mesmo CPF pode vir
 * formatado de jeitos diferentes em cada planilha.
 *
 * @param value Valor bruto lido da célula (pode ser string, number, etc).
 * @returns Apenas os dígitos do CPF, ex: "11144477735".
 */
export function normalizeCpf(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '')
}

/**
 * Formata 11 dígitos no padrão visual de CPF (000.000.000-00).
 * Se não tiver exatamente 11 dígitos (CPF incompleto/inválido), devolve o
 * valor original sem tentar formatar, para não exibir algo enganoso.
 *
 * @param digits CPF já normalizado (só dígitos).
 * @returns CPF formatado, ou o valor de entrada sem alteração.
 */
export function formatCpf(digits: string): string {
  if (digits.length !== 11) return digits
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

/**
 * Calcula um dígito verificador de CPF pelo algoritmo oficial (módulo 11).
 * Função interna usada duas vezes por `isValidCpf`: uma para o primeiro
 * dígito verificador, outra para o segundo (que já inclui o primeiro).
 *
 * @param base Sequência de dígitos sobre a qual o dígito verificador é calculado.
 * @returns O dígito verificador calculado (0-9).
 */
function calcCheckDigit(base: string): number {
  let sum = 0
  let weight = base.length + 1
  for (const char of base) {
    sum += Number(char) * weight
    weight -= 1
  }
  const rest = (sum * 10) % 11
  return rest === 10 ? 0 : rest
}

/**
 * Valida um CPF conferindo os dois dígitos verificadores.
 * Rejeita também sequências repetidas (ex: "111.111.111-11"), que têm
 * dígitos verificadores válidos mas nunca são CPFs reais.
 *
 * @param digits CPF já normalizado (só dígitos, 11 caracteres esperados).
 * @returns true se o CPF é válido segundo o algoritmo oficial.
 */
export function isValidCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
  const base = digits.slice(0, 9)
  const d1 = calcCheckDigit(base)
  const d2 = calcCheckDigit(base + d1)
  return digits === base + String(d1) + String(d2)
}
