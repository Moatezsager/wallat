
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

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

// Register PWA Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content is available; please refresh.');
    window.dispatchEvent(new CustomEvent('swUpdated', { detail: { updateSW } }));
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});
