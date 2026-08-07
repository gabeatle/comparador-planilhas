import { useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { readSpreadsheet } from '../lib/excel'
import type { ParsedSheet } from '../types'

export interface LoadedFile {
  file: File
  sheet: ParsedSheet
}

interface UploadSlotProps {
  id: string
  title: string
  value: LoadedFile | null
  onChange: (value: LoadedFile | null) => void
}

/**
 * Uma área de upload (drag-and-drop ou clique) para um dos dois arquivos —
 * mês anterior ou mês atual. Cuida de ler o arquivo, mostrar o estado de
 * carregamento e exibir erros de leitura; o resultado (planilha lida) sobe
 * para o componente pai via `onChange`.
 */
function UploadSlot({ id, title, value, onChange }: UploadSlotProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  /** Lê o arquivo selecionado/arrastado e propaga o resultado (ou erro) para o pai. */
  const processFile = async (file: File) => {
    setError(null)
    setLoading(true)
    try {
      const sheet = await readSpreadsheet(file)
      if (sheet.rows.length === 0) {
        setError('A planilha não tem nenhuma linha de dados.')
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
      <span className="dropzone__hint">Arraste o arquivo aqui ou clique para selecionar (.xls ou .xlsx)</span>
      {loading && <span className="dropzone__hint">Lendo arquivo…</span>}
      {value && !loading && (
        <span className="dropzone__file">
          {value.file.name} · {value.sheet.rows.length} linhas
        </span>
      )}
      {error && <span className="field-error">{error}</span>}
      <input id={id} type="file" accept=".xls,.xlsx" onChange={handleInputChange} />
    </label>
  )
}

interface UploadStepProps {
  previous: LoadedFile | null
  current: LoadedFile | null
  onPreviousChange: (value: LoadedFile | null) => void
  onCurrentChange: (value: LoadedFile | null) => void
  onContinue: () => void
}

/**
 * Passo 1 do fluxo: tela onde o usuário sobe as duas planilhas (mês anterior
 * e mês atual). O botão "Continuar" só fica habilitado depois que os dois
 * arquivos foram lidos com sucesso.
 */
export function UploadStep({ previous, current, onPreviousChange, onCurrentChange, onContinue }: UploadStepProps) {
  const canContinue = Boolean(previous && current)

  return (
    <div className="card">
      <div>
        <h2>1. Envie as duas planilhas</h2>
        <p className="card-subtitle">
          Formatos aceitos: .xls e .xlsx. As duas planilhas devem ser da mesma operadora e do mesmo tipo de
          plano (saúde, vida ou previdência).
        </p>
      </div>
      <div className="upload-grid">
        <UploadSlot id="upload-previous" title="Planilha do mês anterior" value={previous} onChange={onPreviousChange} />
        <UploadSlot id="upload-current" title="Planilha do mês atual" value={current} onChange={onCurrentChange} />
      </div>
      <div className="actions-row">
        <button type="button" className="btn btn-primary" disabled={!canContinue} onClick={onContinue}>
          Continuar para mapeamento de colunas
        </button>
      </div>
    </div>
  )
}
