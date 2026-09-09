import { useMemo, useState } from 'react'
import type { ComparatorProfile } from '../comparatorProfiles'
import { UploadStep } from './UploadStep'
import type { LoadedFile } from './UploadStep'
import { MappingStep } from './MappingStep'
import { ResultStep } from './ResultStep'
import { guessIdentityMapping } from '../lib/mapping'
import { buildRecords, compareMonths } from '../lib/compare'
import type { ComparisonField, IdentityMapping } from '../types'

type Step = 'upload' | 'mapping' | 'result'

/** Ordem fixa dos passos do fluxo, usada para navegação e para os indicadores no topo da tela. */
const STEP_ORDER: Step[] = ['upload', 'mapping', 'result']

/** Rótulos exibidos nos indicadores de passo no topo da tela. */
const STEP_LABELS: Record<Step, string> = {
  upload: '1. Upload',
  mapping: '2. Mapeamento',
  result: '3. Resultado',
}

interface ComparatorSectionProps {
  profile: ComparatorProfile
}

/**
 * Uma seção completa de comparação (upload → mapeamento → resultado),
 * parametrizada por um `ComparatorProfile` (Fatura, Matriz, etc.). Guarda o
 * estado do fluxo inteiro dessa seção — cada seção é independente das
 * outras que estiverem na mesma página (ver `App.tsx`), inclusive quanto ao
 * passo atual.
 */
export function ComparatorSection({ profile }: ComparatorSectionProps) {
  const [step, setStep] = useState<Step>('upload')

  const [previous, setPrevious] = useState<LoadedFile | null>(null)
  const [current, setCurrent] = useState<LoadedFile | null>(null)
  const [previousIdentity, setPreviousIdentity] = useState<IdentityMapping | null>(null)
  const [currentIdentity, setCurrentIdentity] = useState<IdentityMapping | null>(null)
  const [fields, setFields] = useState<ComparisonField[] | null>(null)

  /**
   * Resultado da comparação, recalculado só quando o usuário está no passo
   * "result" (evita processar as planilhas antes da hora, por exemplo
   * enquanto ele ainda está ajustando o mapeamento de colunas).
   */
  const comparisonResult = useMemo(() => {
    if (step !== 'result' || !previous || !current || !previousIdentity || !currentIdentity || !fields) return null
    const previousRecords = buildRecords(previous.sheet.rows, previousIdentity, profile.identityFields, fields, 'previous')
    const currentRecords = buildRecords(current.sheet.rows, currentIdentity, profile.identityFields, fields, 'current')
    return compareMonths(previousRecords, currentRecords, profile.identityFields, fields)
  }, [step, previous, current, previousIdentity, currentIdentity, fields, profile])

  /**
   * Avança do upload para o mapeamento, pré-preenchendo a identidade
   * (`guessIdentityMapping`) com a melhor tentativa automática — mas só na
   * primeira vez (`existing ?? ...`), para não sobrescrever ajustes manuais
   * do usuário caso ele volte a este passo depois. Os campos de comparação
   * começam vazios (nenhuma coluna marcada); o usuário escolhe manualmente.
   */
  const handleGoToMapping = () => {
    if (!previous || !current) return
    setPreviousIdentity((existing) => existing ?? guessIdentityMapping(previous.sheet.headers, profile.identityFields))
    setCurrentIdentity((existing) => existing ?? guessIdentityMapping(current.sheet.headers, profile.identityFields))
    setFields((existing) => existing ?? [])
    setStep('mapping')
  }

  /** Limpa todo o estado e volta para o início, para o usuário fazer uma nova comparação. */
  const handleReset = () => {
    setStep('upload')
    setPrevious(null)
    setCurrent(null)
    setPreviousIdentity(null)
    setCurrentIdentity(null)
    setFields(null)
  }

  const currentIndex = STEP_ORDER.indexOf(step)

  return (
    <section className="comparator-section">
      <h1 className="comparator-section__title">{profile.sectionTitle}</h1>

      <div className="steps">
        {STEP_ORDER.map((s, index) => (
          <span key={s} className="step-pill" data-active={s === step} data-done={index < currentIndex}>
            {STEP_LABELS[s]}
          </span>
        ))}
      </div>

      {step === 'upload' && (
        <UploadStep
          sectionId={profile.id}
          previousLabel={profile.uploadPreviousLabel}
          currentLabel={profile.uploadCurrentLabel}
          description={profile.uploadDescription}
          previous={previous}
          current={current}
          onPreviousChange={setPrevious}
          onCurrentChange={setCurrent}
          onContinue={handleGoToMapping}
        />
      )}

      {step === 'mapping' && previous && current && previousIdentity && currentIdentity && fields && (
        <MappingStep
          sectionId={profile.id}
          identityFields={profile.identityFields}
          previousSheet={previous.sheet}
          currentSheet={current.sheet}
          previousIdentity={previousIdentity}
          currentIdentity={currentIdentity}
          onPreviousIdentityChange={setPreviousIdentity}
          onCurrentIdentityChange={setCurrentIdentity}
          fields={fields}
          onFieldsChange={setFields}
          onBack={() => setStep('upload')}
          onContinue={() => setStep('result')}
        />
      )}

      {step === 'result' && comparisonResult && (
        <ResultStep sectionId={profile.id} result={comparisonResult} onReset={handleReset} />
      )}
    </section>
  )
}
