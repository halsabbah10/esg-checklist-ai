import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// import './styles/scrollLock.css'; // Temporarily disabled to fix scroll
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
