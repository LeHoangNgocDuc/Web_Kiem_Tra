import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// Đã xóa dòng import './index.css' vì bạn dùng Tailwind CDN và file này không tồn tại

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
