import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { CatalogProvider } from './lib/catalog.jsx'
import { LibraryProvider } from './lib/library.jsx'

try {
  const saved = localStorage.getItem('cse-theme')
  const theme = saved === 'light' || saved === 'dark'
    ? saved
    : window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  document.documentElement.dataset.theme = theme
} catch {
  document.documentElement.dataset.theme = 'light'
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <CatalogProvider>
        <LibraryProvider>
          <App />
        </LibraryProvider>
      </CatalogProvider>
    </BrowserRouter>
  </StrictMode>,
)
