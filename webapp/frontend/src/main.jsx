import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Handle GitHub Pages SPA routing redirect
if (sessionStorage.redirect) {
  const redirect = sessionStorage.redirect
  delete sessionStorage.redirect
  if (redirect !== location.href) {
    history.replaceState(null, null, redirect)
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
