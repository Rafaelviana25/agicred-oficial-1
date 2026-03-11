import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agicred.app',
  appName: 'Agicred',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#7c3aed',
      overlaysWebView: false,
    }
  }
};

export default config;
