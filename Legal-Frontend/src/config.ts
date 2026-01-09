// Platform detection helper
const getPlatform = (): string => {
    try {
        // Check if running in Capacitor environment
        if (typeof window !== 'undefined' && (window as any).Capacitor) {
            return (window as any).Capacitor.getPlatform?.() || 'web';
        }
    } catch {
        // Fallback to web
    }
    return 'web';
};

export const getBackendUrl = (): string => 
{
    if (typeof window !== 'undefined' && (window as any).__BACKEND_URL__) 
    {
        return (window as any).__BACKEND_URL__
    }

    const platform = getPlatform();
    console.log(`[Config] Platform: ${platform}, Env URL: ${import.meta.env.VITE_BACKEND_URL}`);

    if (platform === 'android') 
    {
        // Force Emulator IP for Android to avoid .env overriding it with LAN IP or localhost
        // If you are on a real device, change this to your computer's LAN IP (e.g., http://192.168.1.x:8080)
        // return 'http://10.0.2.2:8080';
        return 'http://192.168.1.5:8080';
    }

    if (import.meta.env.VITE_BACKEND_URL) 
    {
        return import.meta.env.VITE_BACKEND_URL;
    }

    return ''; // Web fallback (will use relative path)
}

export const API_BASE_URL = getBackendUrl() ? `${getBackendUrl()}/api/v1` : '/api/v1';
