import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

// Manejar redirección automática en popup de Google OAuth
if (window.opener && window.location.hash.includes('access_token=')) {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');
  if (accessToken) {
    window.opener.postMessage(
      { type: 'EVALUADOR_GDRIVE_AUTH', accessToken, expiresIn },
      '*'
    );
    window.close();
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
