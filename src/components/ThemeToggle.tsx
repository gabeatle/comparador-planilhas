import type { Theme } from '../hooks/useTheme'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

/**
 * Botão redondo no cabeçalho que alterna entre o tema claro e escuro
 * (ícone de sol/lua). O estado real do tema é controlado pelo hook
 * `useTheme`; este componente só exibe o ícone correspondente e dispara
 * `onToggle` ao ser clicado.
 */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
    >
      <svg className="theme-toggle__icon theme-toggle__icon--sun" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.5" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <line x1="12" y1="1.5" x2="12" y2="4.5" />
          <line x1="12" y1="19.5" x2="12" y2="22.5" />
          <line x1="1.5" y1="12" x2="4.5" y2="12" />
          <line x1="19.5" y1="12" x2="22.5" y2="12" />
          <line x1="4.4" y1="4.4" x2="6.5" y2="6.5" />
          <line x1="17.5" y1="17.5" x2="19.6" y2="19.6" />
          <line x1="4.4" y1="19.6" x2="6.5" y2="17.5" />
          <line x1="17.5" y1="6.5" x2="19.6" y2="4.4" />
        </g>
      </svg>
      <svg className="theme-toggle__icon theme-toggle__icon--moon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M20.4 14.7A8.9 8.9 0 1 1 9.3 3.6a7 7 0 0 0 11.1 11.1Z"
        />
      </svg>
    </button>
  )
}
