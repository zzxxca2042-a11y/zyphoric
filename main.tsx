import React from 'react';
import ReactDOM, { hydrateRoot, createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

const loadGoogleAnalytics = () => {
  if (!GA_MEASUREMENT_ID) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  const inline = document.createElement('script');
  inline.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = window.gtag || gtag;
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
  `;
  document.head.appendChild(inline);
};

// Client-side Sentry not enabled by default to avoid peer dependency issues with React 19.

// Register PWA Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) updateSW(true);
  },
});

if (typeof window !== 'undefined') {
  loadGoogleAnalytics();
}

const rootEl = document.getElementById('root')!;
if (rootEl.hasChildNodes()) {
  hydrateRoot(
    rootEl,
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
} else {
  createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}