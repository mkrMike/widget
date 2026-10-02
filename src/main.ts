import { createApi } from './api'
import { readConfig } from './config'
import { setLanguage } from './i18n'
import { ChatWidget, hostId } from './widget'

const config = readConfig()

if (!config) {
  console.error('[Samatrica widget] The script tag needs a data-widget-key attribute.')
} else if (!document.getElementById(hostId)) {
  setLanguage(config.lang)
  // (The check above ignores the script being embedded twice.)
  const start = () => new ChatWidget(createApi(config), config.widgetKey)

  if (document.body) {
    start()
  } else {
    // Embedded in <head>.
    document.addEventListener('DOMContentLoaded', start, { once: true })
  }
}
