import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@/i18n'
import { installGlobalErrorHandlers } from '@/lib/errorReporter'
import App from './App.tsx'
import './index.css'

// Install AutoDebugger global error handlers (window.onerror, unhandledrejection)
installGlobalErrorHandlers();

/**
 * Application entry point
 * @crossref:uses[App, BrowserRouter]
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
