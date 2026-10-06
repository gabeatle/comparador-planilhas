import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import type { CellValue, ParsedSheet } from '../types'
import { normalizeHeader } from './mapping'

/**
 * Importa o pdf.js sob demanda (mesmo motivo do SheetJS em lib/excel.ts: é
 * pesado e só é necessário quando o usuário realmente sobe um PDF) e aponta
 * o worker dele para o arquivo empacotado pelo Vite.
 */
async function loadPdfJs() {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

/** Um pedaço de texto posicionado na página (coordenadas do PDF: y cresce para cima). */
interface Chunk {
  text: string
  x0: number
  x1: number
}

/** Uma linha visual da página: pedaços de texto com (aproximadamente) o mesmo y, ordenados da esquerda para a direita. */
interface Line {
  y: number
  chunks: Chunk[]
}

/** Palavras que costumam aparecer em cabeçalhos de faturas/matrizes — ajudam a achar a linha de cabeçalho. */
const HEADER_HINTS = ['cpf', 'nome', 'plano', 'valor', 'carteir', 'matric', 'titular', 'dependente', 'parentesco', 'nascimento', 'cod', 'sexo', 'idade']

/**
 * Agrupa os itens de texto de uma página em linhas visuais e, dentro de cada
 * linha, junta itens vizinhos (separados por menos de ~meia altura de fonte)
 * num único pedaço — é o que vira o conteúdo de uma célula.
 */
function pageToLines(items: TextItem[]): Line[] {
  const positioned = items
    .filter((item) => item.str.trim() !== '')
    .map((item) => ({
      text: item.str,
      x: item.transform[4] as number,
      y: item.transform[5] as number,
      width: item.width,
      height: item.height || Math.abs(item.transform[3] as number) || 10,
    }))
    .sort((a, b) => b.y - a.y || a.x - b.x)

  const rawLines: { y: number; height: number; items: typeof positioned }[] = []
  for (const item of positioned) {
    const line = rawLines.find((l) => Math.abs(l.y - item.y) <= Math.max(2, Math.min(l.height, item.height) * 0.5))
    if (line) line.items.push(item)
    else rawLines.push({ y: item.y, height: item.height, items: [item] })
  }

  return rawLines
    .sort((a, b) => b.y - a.y)
    .map((line) => {
      const sorted = line.items.sort((a, b) => a.x - b.x)
      const chunks: Chunk[] = []
      for (const item of sorted) {
        const last = chunks.at(-1)
        const gap = last ? item.x - last.x1 : Infinity
        if (last && gap < item.height * 0.6) {
          last.text += (gap > item.height * 0.15 ? ' ' : '') + item.text
          last.x1 = Math.max(last.x1, item.x + item.width)
        } else {
          chunks.push({ text: item.text, x0: item.x, x1: item.x + item.width })
        }
      }
      for (const chunk of chunks) chunk.text = chunk.text.replace(/\s+/g, ' ').trim()
      return { y: line.y, chunks: chunks.filter((chunk) => chunk.text !== '') }
    })
}

/**
 * Pontua uma linha como candidata a cabeçalho: precisa ter várias colunas,
 * quase nenhum número (cabeçalhos são palavras; linhas de dados têm CPF,
 * datas e valores) e ganha bônus por conter palavras típicas de cabeçalho.
 */
function headerScore(line: Line): number {
  if (line.chunks.length < 2) return 0
  const numeric = line.chunks.filter((chunk) => /\d/.test(chunk.text)).length
  if (numeric > line.chunks.length * 0.2) return 0
  const hints = line.chunks.filter((chunk) => HEADER_HINTS.some((hint) => normalizeHeader(chunk.text).includes(hint))).length
  return line.chunks.length + hints * 2
}

/** Texto normalizado de uma linha inteira — usado para reconhecer o cabeçalho repetido no topo das páginas seguintes. */
function lineSignature(line: Line): string {
  return line.chunks.map((chunk) => normalizeHeader(chunk.text)).join('|')
}

/** Índice da coluna onde um pedaço de texto cai: a de maior sobreposição horizontal, ou a de centro mais próximo. */
function columnFor(chunk: Chunk, columns: Chunk[]): number {
  let best = 0
  let bestOverlap = 0
  let bestDistance = Infinity
  columns.forEach((column, index) => {
    const overlap = Math.min(chunk.x1, column.x1) - Math.max(chunk.x0, column.x0)
    const distance = Math.abs((chunk.x0 + chunk.x1) / 2 - (column.x0 + column.x1) / 2)
    if (overlap > bestOverlap || (bestOverlap <= 0 && overlap <= 0 && distance < bestDistance)) {
      best = index
      bestOverlap = Math.max(overlap, 0)
      bestDistance = distance
    }
  })
  return best
}

/**
 * Lê a tabela de beneficiários de um PDF com texto selecionável (gerado por
 * sistema, não escaneado) e devolve no mesmo formato de `readSpreadsheet`,
 * para o resto do app (Comparador e Unificador) tratar igual a uma planilha.
 *
 * Como o PDF não guarda "células", a tabela é reconstruída pela posição do
 * texto na página:
 * - a linha de cabeçalho é a da primeira página com mais colunas de texto
 *   (sem números), com preferência para palavras como CPF, Nome, Plano;
 * - as colunas são as posições horizontais dos títulos do cabeçalho, e cada
 *   texto das linhas seguintes vai para a coluna sobre a qual ele está;
 * - nas páginas seguintes, o cabeçalho repetido (e o que vem antes dele,
 *   como logotipo e dados da empresa) é ignorado;
 * - linhas com só um valor preenchido (número de página, rodapé, títulos)
 *   são descartadas.
 *
 * Limitações conhecidas: cabeçalhos quebrados em duas linhas ficam só com a
 * linha principal, e células com texto quebrado em várias linhas perdem a
 * continuação. Linhas de totais podem aparecer no resultado.
 *
 * @param file Arquivo PDF selecionado pelo usuário.
 * @throws Error se o PDF não tiver texto (escaneado) ou não tiver uma tabela reconhecível.
 */
export async function readPdfTable(file: File): Promise<ParsedSheet> {
  const pdfjs = await loadPdfJs()
  const data = new Uint8Array(await file.arrayBuffer())

  const loadingTask = pdfjs.getDocument({ data })
  let pdf
  try {
    pdf = await loadingTask.promise
  } catch (err) {
    if (err instanceof Error && err.name === 'PasswordException') {
      throw new Error('Este PDF é protegido por senha. Remova a senha e tente de novo.')
    }
    throw new Error('Não foi possível abrir este PDF.')
  }

  const pages: Line[][] = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(pageToLines(content.items.filter((item): item is TextItem => 'str' in item)))
  }
  await loadingTask.destroy()

  if (pages.every((lines) => lines.length === 0)) {
    throw new Error('Este PDF não tem texto selecionável (parece escaneado). Só PDFs gerados por sistema são suportados.')
  }

  // O cabeçalho é procurado na primeira página que tiver alguma linha candidata.
  let headerPage = -1
  let headerIndex = -1
  for (let p = 0; p < pages.length && headerPage === -1; p++) {
    let bestScore = 0
    pages[p].forEach((line, index) => {
      const score = headerScore(line)
      if (score > bestScore) {
        bestScore = score
        headerIndex = index
      }
    })
    if (bestScore > 0) headerPage = p
  }
  if (headerPage === -1) {
    throw new Error('Não foi possível encontrar uma tabela com cabeçalho neste PDF.')
  }

  const headerLine = pages[headerPage][headerIndex]
  const columns = headerLine.chunks
  const signature = lineSignature(headerLine)

  const seen = new Map<string, number>()
  const headers = columns.map((column) => {
    const count = seen.get(column.text) ?? 0
    seen.set(column.text, count + 1)
    return count === 0 ? column.text : `${column.text} (${count + 1})`
  })

  const rows: Record<string, CellValue>[] = []
  for (let p = headerPage; p < pages.length; p++) {
    const lines = pages[p]
    let start = 0
    if (p === headerPage) {
      start = headerIndex + 1
    } else {
      const repeated = lines.findIndex((line) => lineSignature(line) === signature)
      if (repeated !== -1) start = repeated + 1
    }

    for (const line of lines.slice(start)) {
      const cells: string[] = columns.map(() => '')
      for (const chunk of line.chunks) {
        const index = columnFor(chunk, columns)
        cells[index] = cells[index] ? `${cells[index]} ${chunk.text}` : chunk.text
      }
      if (cells.filter((cell) => cell !== '').length < 2) continue

      const record: Record<string, CellValue> = {}
      headers.forEach((header, index) => {
        record[header] = cells[index]
      })
      rows.push(record)
    }
  }

  return { fileName: file.name, headers, rows }
}
