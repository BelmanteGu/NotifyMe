import { ref, watchEffect } from 'vue'

/**
 * Composable de tema light/dark.
 *
 * - Inicializa lendo a preferência do sistema operacional (prefers-color-scheme)
 * - Persiste a escolha do usuário em localStorage
 * - Aplica/remove a classe `.dark` no <html>, que é o que dispara as variáveis CSS
 *   definidas em src/style.css
 *
 * Uso:
 *   const { isDark, toggle } = useTheme()
 *   <button @click="toggle">{{ isDark ? 'Light' : 'Dark' }}</button>
 */

const STORAGE_KEY = 'notifyme:theme'

function getInitialTheme(): boolean {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'dark') return true
  if (saved === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

const isDark = ref(getInitialTheme())

watchEffect(() => {
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
})

export function useTheme() {
  return {
    isDark,
    toggle: () => {
      isDark.value = !isDark.value
    },
  }
}
