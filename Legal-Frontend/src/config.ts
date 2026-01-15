// Platform detection helper
const getPlatform = (): string => 
{
    try 
    {
        // Check if running in Android WebView
        if (typeof window !== 'undefined') 
        {
            const ua = navigator.userAgent || '';
            if (ua.includes('Android') && ua.includes('wv')) 
            {
                return 'android';
            }
            // Check Capacitor
            if ((window as any).Capacitor) 
            {
                return (window as any).Capacitor.getPlatform?.() || 'web';
            }
        }
    }
    catch 
    {
        // Fallback to web
    }
    return 'web';
};

// Railway production backend URL (only for mobile app)
const RAILWAY_BACKEND_URL = 'https://legal-production-c091.up.railway.app';

// Docker/Local development backend URL (for web)
const LOCAL_BACKEND_URL = 'http://localhost:8080';

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

    // 2. On Android/mobile, ALWAYS use Railway production
    if (platform === 'android') 
    {
        console.log(`[Config] Mobile platform - using Railway: ${RAILWAY_BACKEND_URL}`);
        return RAILWAY_BACKEND_URL;
    }

    // 3. On Web: use env URL if provided, otherwise use local Docker
    if (envUrl) 
    {
        console.log(`[Config] Web platform - using env URL: ${envUrl}`);
        return envUrl;
    }

    // 4. Default for web: local Docker backend
    console.log(`[Config] Web platform - using local Docker: ${LOCAL_BACKEND_URL}`);
    return LOCAL_BACKEND_URL;
}

export const API_BASE_URL = getBackendUrl() ? `${getBackendUrl()}/api/v1` : '/api/v1';
