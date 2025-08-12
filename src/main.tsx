import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { TesteSalvamento } from '@/lib/testeSalvamento'

// Expor funções de teste globalmente para debugging
declare global {
  interface Window {
    TesteSalvamento: typeof TesteSalvamento;
  }
}

window.TesteSalvamento = TesteSalvamento;

createRoot(document.getElementById("root")!).render(<App />);
