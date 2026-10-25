import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// aplica o tema salvo antes da primeira pintura
try {
  const t = localStorage.getItem('bravus.lead.theme') || 'system';
  if (t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark');
} catch { /* */ }

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
