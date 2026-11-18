import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Google Maps Platform Quota Defense
const QUOTA_STORAGE_KEY = 'pv_gmp_quota_exceeded';

const markGmpQuotaExceeded = (args?: unknown[]) => {
  try {
    sessionStorage.setItem(QUOTA_STORAGE_KEY, String(Date.now()));
  } catch {
    // Ignore storage access errors in restricted contexts
  }
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  if (args && args.length > 0) {
    console.warn(
      '[PreserVenice] Google Maps Platform quota limit reached; using offline Survey123 GIS view.',
      ...args
    );
  }
};

(window as any).gm_authFailure = () => {
  markGmpQuotaExceeded();
};

const origError = console.error;
console.error = (...args: unknown[]) => {
  const msg = args.map((a) => String(a)).join(' ');
  if (
    msg.includes('OverQuotaMapError') ||
    msg.includes('QuotaExceededError') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('exceeded your daily request quota')
  ) {
    markGmpQuotaExceeded(args);
    return;
  }
  origError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(<App />);
