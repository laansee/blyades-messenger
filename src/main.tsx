import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

  // document.title = "Blyades Messenger"

// 🚀 РЕГИСТРАЦИЯ ПОДСИСТЕМЫ PWA ДЛЯ ОКНА УСТАНОВКИ
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Blyades PWA ServiceWorker успешно зарегистрирован! 🎉');
      })
      .catch((error) => {
        console.error('Ошибка при регистрации ServiceWorker:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
