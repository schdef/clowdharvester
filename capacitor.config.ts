import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cloudharvesters.game',
  appName: 'Cloud Harvesters',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
