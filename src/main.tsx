import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import './index.css';

console.log("%c🚀 Repo Trace PROTOCOL [v4.6] ENGAGED [SYNCHRO_STABLE]", "color: #00FFFF; font-weight: bold; font-size: 24px; text-shadow: 2px 2px 0px #000;");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);
