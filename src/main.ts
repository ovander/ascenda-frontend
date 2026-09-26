import { createApp } from 'vue'
import { createPinia } from 'pinia'
import * as Sentry from '@sentry/vue'
import App from './App.vue'
import router from './router'
import { i18n } from './plugins/i18n'
import { setupPrimeVue } from './plugins/primevue'
import './plugins/chartjs'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
setupPrimeVue(app)

// Sentry error monitoring — enabled only when VITE_SENTRY_DSN is set.
// In development, leave the env var unset to keep the console clean.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN as string,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    integrations: [
      Sentry.browserTracingIntegration({ router }),
    ],
    // Capture 10 % of transactions for performance monitoring.
    tracesSampleRate: 0.1,
  })
}

app.mount('#app')
