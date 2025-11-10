# Legal Frontend Mobile (Virtual Receptionist)

This folder contains an Expo + React Native scaffold for the Virtual Receptionist screen.

Key files:
- `src/VirtualReceptionistScreen.tsx` - main screen
- `src/components/*` - avatar, query box, response card
- `src/api.ts` - Axios-based API calls (adjust baseURL)

Run:
1. cd mobile
2. npm install
3. npm run start

Notes:
- Install `react-native-voice` for real STT integration and configure native permissions.
- The app uses `expo-speech` for TTS playback. For production, call backend `/api/tts` for high-quality audio.
