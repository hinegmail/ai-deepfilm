// Author: forsearch | Updated: 2026-04-30
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AlertProvider } from './components/GlobalAlert';

// 全局控制台日志自动注入时间戳
if (typeof window !== 'undefined') {
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;

  const formatTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}]`;
  };

  console.log = (...args) => originalLog(formatTimestamp(), ...args);
  console.info = (...args) => originalInfo(formatTimestamp(), ...args);
  console.warn = (...args) => originalWarn(formatTimestamp(), ...args);
  console.error = (...args) => originalError(formatTimestamp(), ...args);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AlertProvider>
      <App />
    </AlertProvider>
  </React.StrictMode>
);
