
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.friendlyfifa.tracker',
  appName: 'Friendly FIFA Tracker',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Enable this for development with live reload
    // url: 'http://YOUR-LOCAL-IP:5173',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#FFFFFF",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
  },
};

export default config;
