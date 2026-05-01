import { createApp } from 'vue'
import App from './App.vue'
import AlertView from './views/AlertView.vue'
import TimerAlertView from './views/TimerAlertView.vue'
import './style.css'

/**
 * Entry point do Renderer.
 *
 * O Electron carrega o mesmo index.html em situações diferentes:
 *   - Sem query string → renderiza App.vue (janela main)
 *   - ?view=alert&id=xxx → AlertView (janela de lembrete)
 *   - ?view=timer-alert → TimerAlertView (janela de alarme do timer)
 *
 * Mantém um único build/CSS/Tailwind, só decide qual componente
 * raiz renderizar.
 */
const params = new URLSearchParams(window.location.search)
const view = params.get('view')

if (view === 'alert') {
  const reminderId = params.get('id') ?? ''
  createApp(AlertView, { reminderId }).mount('#app')
} else if (view === 'timer-alert') {
  createApp(TimerAlertView).mount('#app')
} else {
  createApp(App).mount('#app')
}
