import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // O site é publicado em usuario.github.io/comparador-planilhas/ (GitHub Pages
  // de projeto, não de usuário), então os assets precisam desse prefixo no caminho.
  base: '/comparador-planilhas/',
})
