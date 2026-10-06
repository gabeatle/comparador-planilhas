import { useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { readSpreadsheet } from '../lib/excel'
import { readPdfTable } from '../lib/pdf'
import type { LoadedFile } from '../types'
import { ALL_EXTENSIONS } from '../comparatorProfiles'
import type { FileExtension } from '../comparatorProfiles'

export type { LoadedFile } from '../types'

export interface UploadSlotProps {
  id: string
  title: string
  value: LoadedFile | null
  onChange: (value: LoadedFile | null) => void
  /** Formatos aceitos neste slot; padrão: planilhas e PDF. */
  accept?: FileExtension[]
}

/** Lista as extensões para exibição, ex: ".xls, .xlsx ou .pdf". */
function describeExtensions(extensions: FileExtension[]): string {
  return extensions.length === 1 ? extensions[0] : `${extensions.slice(0, -1).join(', ')} ou ${extensions.at(-1)}`
}

/**
 * Uma área de upload (drag-and-drop ou clique) para um único arquivo. Cuida
 * de ler o arquivo, mostrar o estado de carregamento e exibir erros de
 * leitura; o resultado (planilha lida) sobe para o componente pai via
 * `onChange`. PDFs passam por `readPdfTable`, que reconstrói a tabela a
 * partir da posição do texto. Reaproveitada tanto pelo fluxo de 2 planilhas (`UploadStep`)
 * quanto pelo Unificador, que sobe um número variável de planilhas.
 */
export function UploadSlot({ id, title, value, onChange, accept = ALL_EXTENSIONS }: UploadSlotProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  /** Lê o arquivo selecionado/arrastado e propaga o resultado (ou erro) para o pai. */
  const processFile = async (file: File) => {
    setError(null)
    // O atributo `accept` do input não vale para arquivos arrastados, então a checagem é feita aqui.
    if (!accept.some((extension) => file.name.toLowerCase().endsWith(extension))) {
      setError(`Formato não aceito aqui. Envie um arquivo ${describeExtensions(accept)}.`)
      onChange(null)
      return
    }
    setLoading(true)
    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf')
      const sheet = isPdf ? await readPdfTable(file) : await readSpreadsheet(file)
      if (sheet.rows.length === 0) {
        setError(isPdf ? 'Nenhuma linha de dados foi encontrada na tabela do PDF.' : 'A planilha não tem nenhuma linha de dados.')
        onChange(null)
        return
      }
      onChange({ file, sheet })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ler este arquivo.')
      onChange(null)
    } finally {
      setLoading(false)
    }
  }

  /** Handler do input de arquivo nativo (clique -> seletor do sistema operacional). */
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void processFile(file)
  }

  /** Handler de soltar um arquivo arrastado sobre a área de upload. */
  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }

  return (
    <label
      className="dropzone"
      htmlFor={id}
      onDrop={handleDrop}
      onDragOver={(event) => event.preventDefault()}
    >
      <span className="dropzone__label">{title}</span>
      <span className="dropzone__hint">Arraste o arquivo aqui ou clique para selecionar ({describeExtensions(accept)})</span>
      {loading && <span className="dropzone__hint">Lendo arquivo…</span>}
      {value && !loading && (
        <span className="dropzone__file">
          {value.file.name} · {value.sheet.rows.length} linhas
        </span>
      )}
      {error && <span className="field-error">{error}</span>}
      <input id={id} type="file" accept={accept.join(',')} onChange={handleInputChange} />
    </label>
  )
}

interface UploadStepProps {
  /** Prefixo único da seção (perfil), usado para evitar colisão de ids de elementos quando duas seções coexistem na página. */
  sectionId: string
  previousLabel: string
  currentLabel: string
  description: string
  previous: LoadedFile | null
  current: LoadedFile | null
  onPreviousChange: (value: LoadedFile | null) => void
  onCurrentChange: (value: LoadedFile | null) => void
  previousAccept?: FileExtension[]
  currentAccept?: FileExtension[]
  onContinue: () => void
}

/**
 * Passo 1 do fluxo: tela onde o usuário sobe as duas planilhas (mês anterior
 * e mês atual). O botão "Continuar" só fica habilitado depois que os dois
 * arquivos foram lidos com sucesso.
 */
export function UploadStep({
  sectionId,
  previousLabel,
  currentLabel,
  description,
  previous,
  current,
  onPreviousChange,
  onCurrentChange,
  previousAccept,
  currentAccept,
  onContinue,
}: UploadStepProps) {
  const canContinue = Boolean(previous && current)

  return (
    <div className="card">
      <div>
        <h2>1. Envie os dois arquivos</h2>
        <p className="card-subtitle">{description}</p>
      </div>
      <div className="upload-grid">
        <UploadSlot id={`${sectionId}-upload-previous`} title={previousLabel} value={previous} onChange={onPreviousChange} accept={previousAccept} />
        <UploadSlot id={`${sectionId}-upload-current`} title={currentLabel} value={current} onChange={onCurrentChange} accept={currentAccept} />
      </div>
      <div className="actions-row">
        <button type="button" className="btn btn-primary" disabled={!canContinue} onClick={onContinue}>
          Continuar para mapeamento de colunas
        </button>
      </div>
    </div>
  )
}
