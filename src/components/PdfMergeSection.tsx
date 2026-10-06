import { useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { mergePdfs } from '../lib/pdfMerge'

let pdfEntryIdCounter = 0

/** Um PDF escolhido pelo usuário, com id estável para a lista (o mesmo arquivo pode ser enviado duas vezes). */
interface PdfEntry {
  id: string
  file: File
}

/**
 * Seção "Juntar PDFs": o usuário escolhe vários PDFs (de uma vez ou aos
 * poucos), ajusta a ordem com as setas e baixa um único PDF com todas as
 * páginas. Não lê os dados de dentro dos arquivos — para usar a tabela de
 * um PDF na comparação ou na unificação, basta enviá-lo direto nas seções
 * de cima.
 */
export function PdfMergeSection() {
  const [entries, setEntries] = useState<PdfEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [merging, setMerging] = useState(false)

  /** Adiciona ao fim da lista só os arquivos que são PDF, ignorando o resto. */
  const addFiles = (files: FileList | null) => {
    if (!files) return
    const pdfs = Array.from(files).filter((file) => file.name.toLowerCase().endsWith('.pdf'))
    setError(pdfs.length < files.length ? 'Só arquivos .pdf podem ser juntados — os outros foram ignorados.' : null)
    setEntries((current) => [...current, ...pdfs.map((file) => ({ id: `pdf-${pdfEntryIdCounter++}`, file }))])
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    addFiles(event.dataTransfer.files)
  }

  /** Troca um arquivo de posição com o vizinho de cima (-1) ou de baixo (+1). */
  const move = (index: number, offset: -1 | 1) => {
    setEntries((current) => {
      const next = [...current]
      ;[next[index], next[index + offset]] = [next[index + offset], next[index]]
      return next
    })
  }

  const handleMerge = async () => {
    setError(null)
    setMerging(true)
    try {
      await mergePdfs(
        entries.map((entry) => entry.file),
        'pdfs-unificados',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível juntar os PDFs.')
    } finally {
      setMerging(false)
    }
  }

  return (
    <section className="comparator-section">
      <h1 className="comparator-section__title">Juntar PDFs</h1>

      <div className="card">
        <div>
          <h2>Envie os PDFs na ordem desejada</h2>
          <p className="card-subtitle">
            Junta as páginas de todos os arquivos num PDF só, na ordem da lista. Para comparar ou unificar os dados
            de um PDF, envie-o direto no Comparador ou no Unificador.
          </p>
        </div>

        <label className="dropzone" htmlFor="pdf-merge-upload" onDrop={handleDrop} onDragOver={(event) => event.preventDefault()}>
          <span className="dropzone__label">Adicionar PDFs</span>
          <span className="dropzone__hint">Arraste os arquivos aqui ou clique para selecionar (pode escolher vários)</span>
          <input id="pdf-merge-upload" type="file" accept=".pdf" multiple onChange={handleInputChange} />
        </label>

        {entries.length > 0 && (
          <ol className="pdf-merge-list">
            {entries.map((entry, index) => (
              <li key={entry.id} className="pdf-merge-list__item">
                <span className="pdf-merge-list__name">{entry.file.name}</span>
                <button
                  type="button"
                  className="pdf-merge-list__btn"
                  aria-label={`Mover ${entry.file.name} para cima`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="pdf-merge-list__btn"
                  aria-label={`Mover ${entry.file.name} para baixo`}
                  disabled={index === entries.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="pdf-merge-list__btn"
                  aria-label={`Remover ${entry.file.name}`}
                  onClick={() => setEntries((current) => current.filter((e) => e.id !== entry.id))}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
        )}

        {error && <span className="field-error">{error}</span>}

        <div className="actions-row">
          {entries.length > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => setEntries([])}>
              Limpar lista
            </button>
          )}
          <button type="button" className="btn btn-primary" disabled={entries.length < 2 || merging} onClick={handleMerge}>
            {merging ? 'Juntando…' : 'Juntar e baixar PDF'}
          </button>
        </div>
      </div>
    </section>
  )
}
