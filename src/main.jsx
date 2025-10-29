import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { WagmiConfig } from './wagmi.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiConfig>
      <App />
    </WagmiConfig>
  </React.StrictMode>,
)