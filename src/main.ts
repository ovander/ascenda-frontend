import { createApp } from 'vue'
import { createPinia } from 'pinia'
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

app.mount('#app')
