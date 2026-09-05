import { Suspense } from 'react'
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import './index.css'
import i18n from './i18n.js'
import App from './App.jsx'
import ErrorBoundary from './ui/ErrorBoundary.jsx'

const rootElement = document.getElementById('root')

const app = (
  <StrictMode>
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <Suspense fallback="">
          <App />
        </Suspense>
      </I18nextProvider>
    </ErrorBoundary>
  </StrictMode>
)

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app)
} else {
  createRoot(rootElement).render(app)
}
