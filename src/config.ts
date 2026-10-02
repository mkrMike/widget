export interface WidgetConfig {
  widgetKey: string
  /** Backend origin without a trailing slash, e.g. "https://api.example.com". */
  apiUrl: string
  /** data-lang="fr": forces the language; otherwise the browser's. */
  lang?: string
}

// Read while the script is executing: document.currentScript is null afterwards.
// It is always null for module scripts (the dev page), hence the fallback.
const script = (document.currentScript ??
  document.querySelector('script[data-widget-key]')) as HTMLScriptElement | null

/**
 * The configuration from the embedding tag:
 * <script src="…/widget.js" data-widget-key="wgt_…" data-api-url="https://api…"></script>
 */
export function readConfig(): WidgetConfig | null {
  const widgetKey = script?.dataset.widgetKey
  if (!widgetKey) {
    return null
  }

  const apiUrl = (script?.dataset.apiUrl ?? 'http://localhost:8080').replace(/\/+$/, '')
  return { widgetKey, apiUrl, lang: script?.dataset.lang }
}
