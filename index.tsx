
import React from 'react';
import ReactDOM from 'react-dom/client';
import { StatusBar, Style } from '@capacitor/status-bar';
import App from './App';

// Initialize status bar for Android/iOS
const initStatusBar = async () => {
  try {
    await StatusBar.setStyle({ style: Style.Dark }); // Dark style means light text
    await StatusBar.setBackgroundColor({ color: '#7c3aed' }); // Tailwind violet-600
  } catch (e) {
    // Ignore errors when not running natively (e.g., in browser)
  }
};
initStatusBar();

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
