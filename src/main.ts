import { createApp } from 'vue'
import App from './App.vue'
import AlertView from './views/AlertView.vue'
import TimerAlertView from './views/TimerAlertView.vue'
import WidgetView from './views/WidgetView.vue'
import NotesCanvasView from './views/NotesCanvasView.vue'
import './style.css'

/**
 * Entry point do Renderer.
 *
 * O Electron carrega o mesmo index.html em situações diferentes:
 *   - Sem query string → renderiza App.vue (janela main)
 *   - ?view=alert&id=xxx → AlertView (janela de lembrete)
 *   - ?view=timer-alert → TimerAlertView (alarme do timer)
 *   - ?view=widget → WidgetView (widget flutuante)
 *   - ?view=notes-canvas → NotesCanvasView (overlay com sticky notes)
 */
const params = new URLSearchParams(window.location.search)
const view = params.get('view')

if (view === 'alert') {
  const reminderId = params.get('id') ?? ''
  createApp(AlertView, { reminderId }).mount('#app')
} else if (view === 'timer-alert') {
  createApp(TimerAlertView).mount('#app')
} else if (view === 'widget') {
  createApp(WidgetView).mount('#app')
} else if (view === 'notes-canvas') {
  createApp(NotesCanvasView).mount('#app')
} else {
  createApp(App).mount('#app')
}
