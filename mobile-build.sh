
#!/bin/bash

# Build the web app
echo "Building web app..."
npm run build

# Sync with Capacitor
echo "Syncing with Capacitor..."
npx cap sync

# Open Android Studio
echo "Opening Android Studio..."
npx cap open android

echo "Build complete! Android Studio should open with your project."
echo "To run on a physical device, connect your device and click the Run button in Android Studio."
echo "To create a release APK, go to Build > Build Bundle(s) / APK(s) > Build APK(s) in Android Studio."
