/**
 * Junta vários PDFs num único arquivo, na ordem recebida (todas as páginas
 * do primeiro, depois todas do segundo etc.), e dispara o download. O
 * pdf-lib é importado sob demanda pelo mesmo motivo do SheetJS e do pdf.js.
 *
 * @param files PDFs escolhidos pelo usuário, já na ordem final.
 * @param fileName Nome do arquivo baixado, sem extensão.
 * @throws Error indicando qual arquivo não pôde ser lido (corrompido ou protegido por senha).
 */
export async function mergePdfs(files: File[], fileName: string): Promise<void> {
  const { PDFDocument } = await import('pdf-lib')
  const merged = await PDFDocument.create()

  for (const file of files) {
    let source
    try {
      source = await PDFDocument.load(await file.arrayBuffer())
    } catch {
      throw new Error(`Não foi possível ler "${file.name}" (arquivo corrompido ou protegido por senha).`)
    }
    const pages = await merged.copyPages(source, source.getPageIndices())
    for (const page of pages) merged.addPage(page)
  }

  const bytes = await merged.save()
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName}.pdf`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
