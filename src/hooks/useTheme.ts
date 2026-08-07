import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

/** Chave usada no localStorage para lembrar a preferência de tema do usuário. */
const STORAGE_KEY = 'comparador-planilhas:theme'

/**
 * Lê a preferência de tema salva no navegador. Se nunca foi definida (ou o
 * valor salvo não é reconhecido), o padrão é o tema claro — a escolha do
 * tema é sempre manual neste app, nunca segue automaticamente o sistema
 * operacional.
 *
 * @returns 'light' ou 'dark'.
 */
function getInitialTheme(): Theme {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'dark' ? 'dark' : 'light'
}

/**
 * Hook que controla o tema claro/escuro do app: mantém o estado atual,
 * aplica o atributo `data-theme` no `<html>` (usado pelas variáveis CSS em
 * index.css) e persiste a escolha no localStorage para a próxima visita.
 *
 * @returns O tema atual e uma função para alternar entre claro e escuro.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }, [])

  return { theme, toggleTheme }
}
