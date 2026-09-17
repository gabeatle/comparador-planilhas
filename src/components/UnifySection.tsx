import { useMemo, useState } from 'react'
import type { UnifyField } from '../types'
import { UnifyUploadStep } from './UnifyUploadStep'
import { UnifyMappingStep } from './UnifyMappingStep'
import { UnifyResultStep } from './UnifyResultStep'
import { createUnifySlot, guessUnifyFields, unifySheets } from '../lib/unify'
import type { UnifySlot, UnifySource } from '../lib/unify'

type Step = 'upload' | 'mapping' | 'result'

const STEP_ORDER: Step[] = ['upload', 'mapping', 'result']

const STEP_LABELS: Record<Step, string> = {
  upload: '1. Upload',
  mapping: '2. Mapeamento',
  result: '3. Resultado',
}

/**
 * Seção completa do Unificador (upload → mapeamento → resultado): junta as
 * linhas de um número variável de planilhas numa planilha só, casando as
 * colunas pelo mapeamento definido pelo usuário. Ao contrário do
 * `ComparatorSection` (sempre exatamente duas planilhas fixas), aqui o
 * número de planilhas é dinâmico — ver `UnifyUploadStep`.
 */
export function UnifySection() {
  const [step, setStep] = useState<Step>('upload')
  const [slots, setSlots] = useState<UnifySlot[]>(() => [createUnifySlot(), createUnifySlot()])
  const [fields, setFields] = useState<UnifyField[] | null>(null)

  /** Planilhas efetivamente carregadas (ignora slots ainda vazios), no formato usado pelas funções de `lib/unify.ts`. */
  const sources: UnifySource[] = useMemo(
    () =>
      slots
        .filter((slot): slot is UnifySlot & { loaded: NonNullable<UnifySlot['loaded']> } => slot.loaded !== null)
        .map((slot) => ({ id: slot.id, sheet: slot.loaded.sheet })),
    [slots],
  )

  /** Avança do upload para o mapeamento, pré-preenchendo os campos com `guessUnifyFields` — mas só na primeira vez. */
  const handleGoToMapping = () => {
    setFields((existing) => existing ?? guessUnifyFields(sources))
    setStep('mapping')
  }

  /** Resultado unificado, recalculado só quando o usuário está no passo "result". */
  const unifiedRows = useMemo(() => {
    if (step !== 'result' || !fields) return null
    return unifySheets(sources, fields)
  }, [step, fields, sources])

  /** Limpa todo o estado e volta para o início, para o usuário fazer uma nova unificação. */
  const handleReset = () => {
    setStep('upload')
    setSlots([createUnifySlot(), createUnifySlot()])
    setFields(null)
  }

  const currentIndex = STEP_ORDER.indexOf(step)

  return (
    <section className="comparator-section">
      <h1 className="comparator-section__title">Unificador de Planilhas</h1>

      <div className="steps">
        {STEP_ORDER.map((s, index) => (
          <span key={s} className="step-pill" data-active={s === step} data-done={index < currentIndex}>
            {STEP_LABELS[s]}
          </span>
        ))}
      </div>

      {step === 'upload' && <UnifyUploadStep slots={slots} onSlotsChange={setSlots} onContinue={handleGoToMapping} />}

      {step === 'mapping' && fields && (
        <UnifyMappingStep
          sources={sources.map((source) => ({ id: source.id, label: source.sheet.fileName, sheet: source.sheet }))}
          fields={fields}
          onFieldsChange={setFields}
          onBack={() => setStep('upload')}
          onContinue={() => setStep('result')}
        />
      )}

      {step === 'result' && unifiedRows && fields && (
        <UnifyResultStep rows={unifiedRows} fields={fields} onReset={handleReset} />
      )}
    </section>
  )
}
