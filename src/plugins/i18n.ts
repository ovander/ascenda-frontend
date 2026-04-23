import { createI18n } from 'vue-i18n'
import fr from '@/locales/fr.json'
import en from '@/locales/en.json'

// Locale is initialised to 'fr' (the app's primary language).
// App.vue watches settingsStore.config.language and updates locale.value
// at runtime whenever a plan is loaded — so the locale always matches
// the active plan's language setting.
export const i18n = createI18n({
  legacy: false,
  locale: 'fr',
  fallbackLocale: 'en',
  messages: { fr, en },
})
