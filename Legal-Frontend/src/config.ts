// Platform detection helper
const getPlatform = (): string => {
    try {
        // Check if running in Android WebView
        if (typeof window !== 'undefined') {
            const ua = navigator.userAgent || '';
            if (ua.includes('Android') && ua.includes('wv')) {
                return 'android';
            }
            // Check Capacitor
            if ((window as any).Capacitor) {
                return (window as any).Capacitor.getPlatform?.() || 'web';
            }
        }
    } catch {
        // Fallback to web
    }
    return 'web';
};

// Railway production backend URL
const PRODUCTION_BACKEND_URL = 'https://legal-production-c091.up.railway.app';

// Check if URL is local development
const isLocalUrl = (url: string): boolean => {
    if (!url) return false;
    return url.includes('localhost') || url.includes('127.0.0.1') || url.includes('192.168.') || url.includes('10.0.');
};

export const getBackendUrl = (): string => 
{
    // 1. First priority: Runtime override from Android native
    if (typeof window !== 'undefined' && (window as any).__BACKEND_URL__) 
    {
        const runtimeUrl = (window as any).__BACKEND_URL__;
        console.log(`[Config] Using runtime URL: ${runtimeUrl}`);
        return runtimeUrl;
    }

    const platform = getPlatform();
    const envUrl = import.meta.env.VITE_BACKEND_URL as string;
    console.log(`[Config] Platform: ${platform}, Env URL: ${envUrl}`);

    // 2. On Android or if env URL is local, use production
    if (platform === 'android' || isLocalUrl(envUrl)) 
    {
        console.log(`[Config] Using production URL: ${PRODUCTION_BACKEND_URL}`);
        return PRODUCTION_BACKEND_URL;
    }

    // 3. Use env URL if available and not local
    if (envUrl) 
    {
        return envUrl;
    }

    // 4. Default to production
    return PRODUCTION_BACKEND_URL;
}

export const API_BASE_URL = getBackendUrl() ? `${getBackendUrl()}/api/v1` : '/api/v1';
