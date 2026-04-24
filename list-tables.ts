import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agicred2.app',
  appName: 'Agicred',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#7C3AED',
      overlaysWebView: false,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_notification",
      iconColor: "#7c3aed",
    }
  }
};

export default config;
