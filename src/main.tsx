import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

function renderBootstrapError(message: string): void {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild)
  }
  const container = document.createElement('div')
  container.style.maxWidth = '640px'
  container.style.margin = '64px auto'
  container.style.padding = '0 16px'
  container.style.fontFamily = 'system-ui, -apple-system, Segoe UI, sans-serif'

  const heading = document.createElement('h1')
  heading.textContent = 'Application Error'
  heading.style.marginBottom = '12px'
  heading.style.fontSize = '20px'

  const text = document.createElement('p')
  text.textContent = message
  text.style.color = '#444'
  text.style.lineHeight = '1.6'

  container.append(heading, text)
  document.body.appendChild(container)
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  renderBootstrapError('Failed to start the application. Please reload the page.')
  throw new Error('Root element #root not found')
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  renderBootstrapError('An unexpected startup error occurred. Please reload the page.')
  throw error
}
