
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// تسجيل Service Worker للـ PWA مع الكشف عن التحديثات
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('PWA Service Worker registered');
        
        // الكشف عن التحديثات
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('New content is available; please refresh.');
                  // يمكن إرسال حدث مخصص هنا لتنبيه المستخدم في App.tsx
                  window.dispatchEvent(new CustomEvent('swUpdated', { detail: reg }));
                }
              }
            };
          }
        };
      })
      .catch(err => console.log('PWA Service Worker registration failed', err));
  });
}
