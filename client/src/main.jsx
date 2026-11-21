import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './styles/global.css';
import './styles/landing.css';
import './styles/app.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#fffcf7',
              color: '#3a2a24',
              borderRadius: 18,
              fontFamily: 'Nunito, system-ui, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              boxShadow: 'inset 0 2px 0 #fff, 0 16px 30px -12px rgba(58,42,36,.35)',
            },
            success: { iconTheme: { primary: '#2f9e66', secondary: '#fff' } },
            error: { iconTheme: { primary: '#e5482b', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
