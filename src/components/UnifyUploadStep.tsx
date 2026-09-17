import { UploadSlot } from './UploadStep'
import type { LoadedFile } from './UploadStep'
import { createUnifySlot } from '../lib/unify'
import type { UnifySlot } from '../lib/unify'

/** Número mínimo de slots (não dá pra remover abaixo disso) e máximo (o "+" some ao chegar nele). */
const MIN_SLOTS = 2
const MAX_SLOTS = 10

interface UnifyUploadStepProps {
  slots: UnifySlot[]
  onSlotsChange: (slots: UnifySlot[]) => void
  onContinue: () => void
}

/**
 * Passo 1 do fluxo do Unificador: sobe um número variável de planilhas (pelo
 * menos duas), com um botão "+" para adicionar mais slots de upload conforme
 * necessário. Cada slot pode ser removido individualmente (exceto os dois
 * primeiros); a lista final de planilhas carregadas segue para o mapeamento
 * de colunas em `UnifyMappingStep`.
 */
export function UnifyUploadStep({ slots, onSlotsChange, onContinue }: UnifyUploadStepProps) {
  const loadedCount = slots.filter((slot) => slot.loaded).length
  const canContinue = loadedCount >= 2

  const handleSlotChange = (id: string, value: LoadedFile | null) => {
    onSlotsChange(slots.map((slot) => (slot.id === id ? { ...slot, loaded: value } : slot)))
  }

  const handleAddSlot = () => {
    onSlotsChange([...slots, createUnifySlot()])
  }

  const handleRemoveSlot = (id: string) => {
    onSlotsChange(slots.filter((slot) => slot.id !== id))
  }

  return (
    <div className="card">
      <div>
        <h2>1. Envie as planilhas</h2>
        <p className="card-subtitle">
          Formatos aceitos: .xls e .xlsx. Envie pelo menos duas planilhas — use o "+" para adicionar mais.
        </p>
      </div>

      <div className="upload-grid">
        {slots.map((slot, index) => (
          <div className="unify-upload-slot" key={slot.id}>
            <UploadSlot
              id={`unify-upload-${slot.id}`}
              title={`Planilha ${index + 1}`}
              value={slot.loaded}
              onChange={(value) => handleSlotChange(slot.id, value)}
            />
            {slots.length > MIN_SLOTS && (
              <button
                type="button"
                className="unify-upload-slot__remove"
                aria-label={`Remover Planilha ${index + 1}`}
                onClick={() => handleRemoveSlot(slot.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}

        {slots.length < MAX_SLOTS && (
          <button type="button" className="unify-add-slot" onClick={handleAddSlot}>
            <span aria-hidden="true">+</span>
            Adicionar planilha
          </button>
        )}
      </div>

      <div className="actions-row">
        <button type="button" className="btn btn-primary" disabled={!canContinue} onClick={onContinue}>
          Continuar para mapeamento de colunas
        </button>
      </div>
    </div>
  )
}
