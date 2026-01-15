import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Navigation, Search, X, Locate, Layers, Route, Clock,
  Star, StarOff, Share2, Copy, Car, Bike, PersonStanding, Bus,
  Coffee, Utensils, Building2, Fuel, Hospital, Hotel, ShoppingBag,
  ParkingCircle, ChevronDown, ChevronUp, Menu, ArrowLeft, Home,
  Compass, ZoomIn, ZoomOut, Map, Satellite, Volume2, VolumeX
} from 'lucide-react';

const GOONG_API_KEY = import.meta.env.VITE_GOONG_API_KEY as string;
const GOONG_MAP_KEY = import.meta.env.VITE_GOONG_MAP_KEY as string;

// Types
interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category?: string;
  note?: string;
  isFavorite?: boolean;
}

interface SearchResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface GoongRoute {
  overview_polyline: { points: string };
  legs: Array<{
    distance: { value: number; text: string };
    duration: { value: number; text: string };
    steps: Array<{
      distance: { value: number; text: string };
      duration: { value: number; text: string };
      html_instructions: string;
      maneuver: string;
    }>;
  }>;
}

interface NearbyPlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  types: string[];
}

// Default legal locations
const defaultPlaces: Place[] = [
  {
    id: '1',
    name: 'Trung tâm trợ giúp pháp lý TP.HCM',
    address: '470 Nguyễn Tri Phương, Phường 9, Quận 10, TP.HCM',
    lat: 10.7628,
    lng: 106.6669,
    category: 'Trung tâm trợ giúp',
    note: 'Miễn phí cho sinh viên, người thu nhập thấp'
  },
  {
    id: '2',
    name: 'Sở Tư pháp TP.HCM',
    address: '141-143 Pasteur, Phường 6, Quận 3, TP.HCM',
    lat: 10.7769,
    lng: 106.6925,
    category: 'Cơ quan nhà nước'
  },
  {
    id: '3',
    name: 'Tòa án nhân dân TP.HCM',
    address: '131 Nam Kỳ Khởi Nghĩa, Phường 7, Quận 3, TP.HCM',
    lat: 10.7811,
    lng: 106.6893,
    category: 'Tòa án'
  },
  {
    id: '4',
    name: 'Đoàn Luật sư TP.HCM',
    address: '98 Nguyễn Trãi, Phường 3, Quận 5, TP.HCM',
    lat: 10.7598,
    lng: 106.6801,
    category: 'Luật sư'
  },
];

// Nearby categories
const nearbyCategories = [
  { id: 'cafe', icon: Coffee, label: 'Quán cafe', color: 'bg-amber-500' },
  { id: 'restaurant', icon: Utensils, label: 'Nhà hàng', color: 'bg-orange-500' },
  { id: 'bank', icon: Building2, label: 'Ngân hàng', color: 'bg-blue-500' },
  { id: 'gas_station', icon: Fuel, label: 'Trạm xăng', color: 'bg-red-500' },
  { id: 'hospital', icon: Hospital, label: 'Bệnh viện', color: 'bg-emerald-500' },
  { id: 'hotel', icon: Hotel, label: 'Khách sạn', color: 'bg-purple-500' },
  { id: 'shopping', icon: ShoppingBag, label: 'Mua sắm', color: 'bg-pink-500' },
  { id: 'parking', icon: ParkingCircle, label: 'Bãi đỗ xe', color: 'bg-cyan-500' },
];

// Transport modes
const transportModes = [
  { id: 'car', icon: Car, label: 'Ô tô' },
  { id: 'bike', icon: Bike, label: 'Xe máy' },
  { id: 'foot', icon: PersonStanding, label: 'Đi bộ' },
  { id: 'bus', icon: Bus, label: 'Xe buýt' },
];

// Map styles
const mapStyles = [
  { id: 'default', icon: Map, label: 'Mặc định', style: 'https://tiles.goong.io/assets/goong_map_web.json' },
  { id: 'satellite', icon: Satellite, label: 'Vệ tinh', style: 'https://tiles.goong.io/assets/goong_satellite.json' },
  { id: 'dark', icon: Map, label: 'Tối', style: 'https://tiles.goong.io/assets/goong_map_dark.json' },
];

const MapPage: React.FC = () =>
{
  const navigate = useNavigate();

  // Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routeLayerRef = useRef<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [favorites, setFavorites] = useState<Place[]>(() => 
{
    const saved = localStorage.getItem('map_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFavorites, setShowFavorites] = useState(false);
  const [currentMapStyle, setCurrentMapStyle] = useState(mapStyles[0]);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Navigation state
  const [showNavigation, setShowNavigation] = useState(false);
  const [navigationOrigin, setNavigationOrigin] = useState<Place | null>(null);
  const [navigationDest, setNavigationDest] = useState<Place | null>(null);
  const [selectedTransport, setSelectedTransport] = useState(transportModes[0]);
  const [route, setRoute] = useState<GoongRoute | null>(null);
  const [showRouteSteps, setShowRouteSteps] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Nearby places
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [selectedNearbyCategory, setSelectedNearbyCategory] = useState<string | null>(null);
  const [showNearbyPanel, setShowNearbyPanel] = useState(false);

  // UI state
  const [showSidebar, setShowSidebar] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [mapBearing, setMapBearing] = useState(0);

  // Load Goong SDK
  useEffect(() =>
{
    // Check if already loaded
    if ((window as any).goongjs)
{
      setLoading(false);
      return;
    }

    // Check if CSS already exists
    if (!document.querySelector('link[href*="goong-js"]'))
{
      const link = document.createElement('link');
      link.href = 'https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    // Check if script already exists
    if (!document.querySelector('script[src*="goong-js"]'))
{
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js';
      script.async = true;
      script.onload = () =>
{
        console.log('Goong SDK loaded');
        setLoading(false);
      };
      script.onerror = (e) =>
{
        console.error('Failed to load Goong SDK', e);
        setLoading(false);
      };
      document.body.appendChild(script);
    }
 else
{
      // Script exists but SDK not ready yet, wait for it
      const checkLoaded = setInterval(() =>
{
        if ((window as any).goongjs)
{
          clearInterval(checkLoaded);
          setLoading(false);
        }
      }, 100);

      return () => clearInterval(checkLoaded);
    }
  }, []);

  // Realtime location tracking with watchPosition
  useEffect(() =>
{
    if (!navigator.geolocation)
{
      setCurrentLocation([106.7009, 10.7769]);
      return;
    }

    // Get initial position first
    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentLocation([pos.coords.longitude, pos.coords.latitude]),
      () => setCurrentLocation([106.7009, 10.7769]),
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Then watch for updates (realtime tracking)
    const watchId = navigator.geolocation.watchPosition(
      (pos) =>
{
        setCurrentLocation([pos.coords.longitude, pos.coords.latitude]);
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Initialize map
  useEffect(() => 
{
    if (loading || !mapRef.current || !(window as any).goongjs || !currentLocation) {return;}

    const goongjs = (window as any).goongjs;
    goongjs.accessToken = GOONG_MAP_KEY;

    const map = new goongjs.Map({
      container: mapRef.current,
      style: currentMapStyle.style,
      center: currentLocation,
      zoom: 14,
      pitch: 0,
      bearing: 0,
    });

    map.addControl(new goongjs.NavigationControl(), 'bottom-right');

    map.on('load', () =>
{
      // Add current location marker (realtime tracking marker)
      const el = document.createElement('div');
      el.className = 'current-location-marker';
      el.innerHTML = `
        <div style="
          width: 24px; height: 24px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 12px rgba(34, 197, 94, 0.5);
          animation: pulse 2s infinite;
          position: relative;
        ">
          <div style="
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 8px; height: 8px;
            background: white;
            border-radius: 50%;
          "></div>
        </div>
      `;

      const userMarker = new goongjs.Marker(el)
        .setLngLat(currentLocation)
        .addTo(map);

      // Store user marker reference for realtime updates
      (map as any).userMarker = userMarker;

      // Add default legal places
      addMarkersToMap(map, defaultPlaces, goongjs);
    });

    map.on('rotate', () => setMapBearing(map.getBearing()));
    map.on('click', (e: any) => 
{
      // Close panels when clicking on map
      setShowSearchResults(false);
      setShowLayerMenu(false);
    });

    mapInstanceRef.current = map;

    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
        70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
        100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
      }
    `;
    document.head.appendChild(style);

    return () => 
{
      map.remove();
      document.head.removeChild(style);
    };
  }, [loading, currentLocation]);

  // Update map style
  useEffect(() =>
{
    if (!mapInstanceRef.current) {return;}
    mapInstanceRef.current.setStyle(currentMapStyle.style);
  }, [currentMapStyle]);

  // Realtime marker update - moves marker as user moves
  useEffect(() =>
{
    if (mapInstanceRef.current?.userMarker && currentLocation)
{
      mapInstanceRef.current.userMarker.setLngLat(currentLocation);
    }
  }, [currentLocation]);

  // Voice navigation - Text to Speech
  const speak = useCallback((text: string) =>
{
    if (!voiceEnabled) {return;}
    if ('speechSynthesis' in window)
{
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const msg = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ''));
      msg.lang = 'vi-VN';
      msg.rate = 1;
      msg.pitch = 1;
      msg.volume = 1;
      window.speechSynthesis.speak(msg);
    }
  }, [voiceEnabled]);

  // Announce navigation start
  useEffect(() =>
{
    if (route?.legs?.[0]?.steps?.length && showNavigation)
{
      const firstStep = route.legs[0].steps[0];
      speak(`Bắt đầu điều hướng. ${firstStep.html_instructions}`);
    }
  }, [route, showNavigation, speak]);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number =>
{
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Track current step and announce upcoming turns
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [lastAnnouncedStep, setLastAnnouncedStep] = useState(-1);

  useEffect(() =>
{
    if (!currentLocation || !route?.legs?.[0]?.steps || !showNavigation) {return;}

    const steps = route.legs[0].steps;
    const userLat = currentLocation[1];
    const userLng = currentLocation[0];

    // Decode polyline to get step waypoints
    let accumulatedDistance = 0;

    for (let i = currentStepIndex; i < steps.length; i++)
{
      const step = steps[i];
      // Approximate step end location from distance
      const stepDistance = step.distance.value;

      // Check if user is within 50m of next step
      if (i > currentStepIndex && accumulatedDistance < 100)
{
        // User approaching next step
        if (i !== lastAnnouncedStep)
{
          speak(`Sau ${Math.round(accumulatedDistance)} mét, ${step.html_instructions}`);
          setLastAnnouncedStep(i);
          setCurrentStepIndex(i);
        }
        break;
      }

      accumulatedDistance += stepDistance;
    }
  }, [currentLocation, route, showNavigation, currentStepIndex, lastAnnouncedStep, speak]);

  // Add markers helper
  const addMarkersToMap = (map: any, places: Place[], goongjs: any) => 
{
    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    places.forEach(place => 
{
      const el = document.createElement('div');
      el.className = 'place-marker';
      el.innerHTML = `
        <div style="
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          <svg style="transform: rotate(45deg); width: 18px; height: 18px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      `;

      const popup = new goongjs.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="font-weight: 600; margin-bottom: 4px; color: #1f2937;">${place.name}</h3>
          <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">${place.address}</p>
          ${place.category ? `<span style="font-size: 11px; padding: 2px 8px; background: #dbeafe; color: #1d4ed8; border-radius: 4px;">${place.category}</span>` : ''}
        </div>
      `);

      const marker = new goongjs.Marker(el)
        .setLngLat([place.lng, place.lat])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener('click', () => 
{
        setSelectedPlace(place);
        map.flyTo({ center: [place.lng, place.lat], zoom: 16 });
      });

      markersRef.current.push(marker);
    });
  };

  // Search autocomplete
  const handleSearch = useCallback(async (query: string) => 
{
    setSearchQuery(query);
    if (query.length < 2) 
{
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try 
{
      const res = await fetch(
        `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(query)}&location=${currentLocation?.[1]},${currentLocation?.[0]}`
      );
      const data = await res.json();
      if (data.predictions) 
{
        setSearchResults(data.predictions);
        setShowSearchResults(true);
      }
    }
 catch (err) 
{
      console.error('Search error:', err);
    }
  }, [currentLocation]);

  // Select search result
  const handleSelectSearchResult = async (result: SearchResult) => 
{
    setShowSearchResults(false);
    setSearchQuery(result.description);

    try 
{
      const res = await fetch(
        `https://rsapi.goong.io/Place/Detail?api_key=${GOONG_API_KEY}&place_id=${result.place_id}`
      );
      const data = await res.json();

      if (data.result) 
{
        const place: Place = {
          id: result.place_id,
          name: result.structured_formatting.main_text,
          address: result.structured_formatting.secondary_text,
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
        };

        setSelectedPlace(place);

        if (mapInstanceRef.current) 
{
          const goongjs = (window as any).goongjs;

          // Add marker
          const el = document.createElement('div');
          el.innerHTML = `
            <div style="
              width: 40px; height: 40px;
              background: linear-gradient(135deg, #8b5cf6, #6d28d9);
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 3px 10px rgba(0,0,0,0.3);
              animation: bounce 0.5s;
            ">
              <svg style="transform: rotate(45deg); width: 20px; height: 20px; color: white;" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="4"/>
              </svg>
            </div>
          `;

          new goongjs.Marker(el)
            .setLngLat([place.lng, place.lat])
            .addTo(mapInstanceRef.current);

          mapInstanceRef.current.flyTo({
            center: [place.lng, place.lat],
            zoom: 16,
            duration: 1500
          });
        }
      }
    }
 catch (err) 
{
      console.error('Place detail error:', err);
    }
  };

  // Get route
  const getRoute = async () => 
{
    if (!navigationOrigin || !navigationDest) {return;}

    try 
{
      const origin = `${navigationOrigin.lat},${navigationOrigin.lng}`;
      const dest = `${navigationDest.lat},${navigationDest.lng}`;
      const vehicle = selectedTransport.id === 'foot' ? 'foot' : selectedTransport.id === 'bike' ? 'bike' : 'car';

      const res = await fetch(
        `https://rsapi.goong.io/Direction?api_key=${GOONG_API_KEY}&origin=${origin}&destination=${dest}&vehicle=${vehicle}`
      );
      const data = await res.json();

      if (data.routes?.length) 
{
        setRoute(data.routes[0]);
        drawRoute(data.routes[0]);
      }
    }
 catch (err) 
{
      console.error('Route error:', err);
    }
  };

  // Draw route on map
  const drawRoute = (routeData: GoongRoute) => 
{
    if (!mapInstanceRef.current) {return;}
    const map = mapInstanceRef.current;

    // Remove existing route
    if (routeLayerRef.current) 
{
      if (map.getLayer('route')) {map.removeLayer('route');}
      if (map.getLayer('route-outline')) {map.removeLayer('route-outline');}
      if (map.getSource('route')) {map.removeSource('route');}
    }

    const coords = decodePolyline(routeData.overview_polyline.points);

    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords }
      }
    });

    // Route outline
    map.addLayer({
      id: 'route-outline',
      type: 'line',
      source: 'route',
      paint: {
        'line-width': 10,
        'line-color': '#1e40af',
        'line-opacity': 0.3
      }
    });

    // Route line
    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      paint: {
        'line-width': 6,
        'line-color': '#3b82f6',
        'line-opacity': 0.9
      }
    });

    routeLayerRef.current = true;

    // Fit bounds
    const goongjs = (window as any).goongjs;
    const bounds = new goongjs.LngLatBounds();
    coords.forEach((c: number[]) => bounds.extend(c as [number, number]));
    map.fitBounds(bounds, { padding: 100 });
  };

  // Decode polyline
  const decodePolyline = (str: string): number[][] => 
{
    let i = 0, lat = 0, lng = 0;
    const coordinates: number[][] = [];

    while (i < str.length) 
{
      let b, shift = 0, result = 0;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lat += ((result & 1) ? ~(result >> 1) : (result >> 1));

      shift = 0; result = 0;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lng += ((result & 1) ? ~(result >> 1) : (result >> 1));

      coordinates.push([lng / 1e5, lat / 1e5]);
    }
    return coordinates;
  };

  // Nearby places search
  const searchNearby = async (category: string) => 
{
    if (!currentLocation) {return;}
    setSelectedNearbyCategory(category);
    setShowNearbyPanel(true);

    try 
{
      const res = await fetch(
        `https://rsapi.goong.io/Place/NearbySearch?api_key=${GOONG_API_KEY}&location=${currentLocation[1]},${currentLocation[0]}&radius=2000&keyword=${category}`
      );
      const data = await res.json();

      if (data.results) 
{
        setNearbyPlaces(data.results);

        // Add markers
        if (mapInstanceRef.current) 
{
          const goongjs = (window as any).goongjs;
          data.results.forEach((place: NearbyPlace) => 
{
            const el = document.createElement('div');
            const cat = nearbyCategories.find(c => c.id === category);
            el.innerHTML = `
              <div style="
                width: 32px; height: 32px;
                background: ${cat?.color.replace('bg-', '#') || '#6b7280'};
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                border: 2px solid white;
              ">
                <span style="color: white; font-size: 14px;">📍</span>
              </div>
            `;

            const popup = new goongjs.Popup({ offset: 20 }).setHTML(`
              <div style="padding: 8px;">
                <h4 style="font-weight: 600; color: #1f2937;">${place.name}</h4>
                <p style="font-size: 11px; color: #6b7280;">${place.formatted_address}</p>
              </div>
            `);

            const marker = new goongjs.Marker(el)
              .setLngLat([place.geometry.location.lng, place.geometry.location.lat])
              .setPopup(popup)
              .addTo(mapInstanceRef.current);

            markersRef.current.push(marker);
          });
        }
      }
    }
 catch (err) 
{
      console.error('Nearby search error:', err);
    }
  };

  // Toggle favorite
  const toggleFavorite = (place: Place) => 
{
    const exists = favorites.find(f => f.id === place.id);
    let newFavorites: Place[];

    if (exists) 
{
      newFavorites = favorites.filter(f => f.id !== place.id);
    }
 else 
{
      newFavorites = [...favorites, { ...place, isFavorite: true }];
    }

    setFavorites(newFavorites);
    localStorage.setItem('map_favorites', JSON.stringify(newFavorites));
  };

  // Share location
  const handleShare = () => 
{
    if (!selectedPlace) {return;}
    const link = `https://www.google.com/maps?q=${selectedPlace.lat},${selectedPlace.lng}`;
    setShareLink(link);
    setShowShareModal(true);
  };

  // Copy to clipboard
  const copyToClipboard = () => 
{
    navigator.clipboard.writeText(shareLink);
  };

  // Map controls
  const zoomIn = () => mapInstanceRef.current?.zoomIn();
  const zoomOut = () => mapInstanceRef.current?.zoomOut();
  const resetBearing = () => mapInstanceRef.current?.setBearing(0);
  const recenter = () => 
{
    if (currentLocation && mapInstanceRef.current) 
{
      mapInstanceRef.current.flyTo({ center: currentLocation, zoom: 15 });
    }
  };

  // Start navigation
  const startNavigation = () => 
{
    if (!selectedPlace || !currentLocation) {return;}

    setNavigationOrigin({
      id: 'current',
      name: 'Vị trí của bạn',
      address: 'Vị trí hiện tại',
      lat: currentLocation[1],
      lng: currentLocation[0]
    });
    setNavigationDest(selectedPlace);
    setShowNavigation(true);
  };

  // Format helpers
  const formatDistance = (m: number) => m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
  const formatDuration = (s: number) => 
{
    const min = Math.round(s / 60);
    if (min < 60) {return `${min} phút`;}
    return `${Math.floor(min / 60)}h ${min % 60}p`;
  };

  // Get route when navigation params change
  useEffect(() => 
{
    if (showNavigation && navigationOrigin && navigationDest) 
{
      getRoute();
    }
  }, [showNavigation, navigationOrigin, navigationDest, selectedTransport]);

  const leg = route?.legs?.[0];

  return (
    <div className="h-screen w-full bg-gray-900 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 bg-gray-900 border-r border-white/10 flex flex-col overflow-hidden z-20`}>
        {/* Search Header */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Tìm kiếm địa điểm..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute left-4 right-4 mt-2 bg-gray-800 border border-white/10 rounded-xl shadow-xl max-h-64 overflow-y-auto z-50">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => handleSelectSearchResult(result)}
                  className="w-full px-4 py-3 text-left hover:bg-white/5 border-b border-white/5 last:border-0"
                >
                  <p className="text-white font-medium text-sm">{result.structured_formatting.main_text}</p>
                  <p className="text-white/50 text-xs mt-1">{result.structured_formatting.secondary_text}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nearby Categories */}
        <div className="p-4 border-b border-white/10">
          <h3 className="text-white/70 text-xs font-semibold uppercase mb-3">Tìm xung quanh</h3>
          <div className="grid grid-cols-4 gap-2">
            {nearbyCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => searchNearby(cat.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                  selectedNearbyCategory === cat.id
                    ? `${cat.color} text-white`
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <cat.icon className="w-5 h-5" />
                <span className="text-[10px]">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setShowFavorites(false)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${!showFavorites ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/50'}`}
          >
            Địa điểm
          </button>
          <button
            onClick={() => setShowFavorites(true)}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${showFavorites ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/50'}`}
          >
            <Star className="w-4 h-4" />
            Đã lưu ({favorites.length})
          </button>
        </div>

        {/* Places List */}
        <div className="flex-1 overflow-y-auto">
          {(showFavorites ? favorites : defaultPlaces).map((place) => (
            <div
              key={place.id}
              onClick={() => 
{
                setSelectedPlace(place);
                mapInstanceRef.current?.flyTo({ center: [place.lng, place.lat], zoom: 16 });
              }}
              className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${
                selectedPlace?.id === place.id ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium text-sm truncate">{place.name}</h4>
                  <p className="text-white/50 text-xs mt-1 line-clamp-2">{place.address}</p>
                  {place.category && (
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                      {place.category}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(place); }}
                  className="text-white/30 hover:text-yellow-400 transition-colors"
                >
                  {favorites.find(f => f.id === place.id)
                    ? <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    : <StarOff className="w-5 h-5" />
                  }
                </button>
              </div>
            </div>
          ))}

          {showFavorites && favorites.length === 0 && (
            <div className="p-8 text-center">
              <Star className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm">Chưa có địa điểm đã lưu</p>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative min-h-0">
        {/* Map */}
        <div
          ref={mapRef}
          className="absolute inset-0 w-full h-full"
          style={{ minHeight: '100%' }}
        />

        {/* Top Left Controls */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          {/* Back/Home Button */}
          <button
            onClick={() => navigate('/assistant')}
            className="bg-white p-2.5 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>

          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="bg-white p-2.5 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Top Right Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          {/* Layer Control */}
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="bg-white p-2.5 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
            >
              <Layers className="w-5 h-5 text-gray-700" />
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                {mapStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => { setCurrentMapStyle(style); setShowLayerMenu(false); }}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 ${
                      currentMapStyle.id === style.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    <style.icon className="w-5 h-5" />
                    <span className="text-sm">{style.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <button onClick={zoomIn} className="p-2.5 hover:bg-gray-50 border-b border-gray-100">
              <ZoomIn className="w-5 h-5 text-gray-700" />
            </button>
            <button onClick={zoomOut} className="p-2.5 hover:bg-gray-50">
              <ZoomOut className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Compass */}
          {mapBearing !== 0 && (
            <button
              onClick={resetBearing}
              className="bg-white p-2.5 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
              style={{ transform: `rotate(${-mapBearing}deg)` }}
            >
              <Compass className="w-5 h-5 text-red-500" />
            </button>
          )}
        </div>

        {/* Recenter Button */}
        <button
          onClick={recenter}
          className="absolute bottom-24 right-4 z-10 bg-white p-3 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
        >
          <Locate className="w-5 h-5 text-blue-600" />
        </button>

        {/* Selected Place Card */}
        {selectedPlace && !showNavigation && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-10 bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-gray-900 font-semibold text-lg">{selectedPlace.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">{selectedPlace.address}</p>
                </div>
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedPlace.category && (
                <span className="inline-block text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded mb-4">
                  {selectedPlace.category}
                </span>
              )}

              <div className="flex gap-2">
                <button
                  onClick={startNavigation}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Chỉ đường
                </button>
                <button
                  onClick={() => toggleFavorite(selectedPlace)}
                  className="px-4 py-2.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {favorites.find(f => f.id === selectedPlace.id)
                    ? <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    : <Star className="w-5 h-5 text-gray-600" />
                  }
                </button>
                <button
                  onClick={handleShare}
                  className="px-4 py-2.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Panel */}
        {showNavigation && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-2xl shadow-xl max-h-[60vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900 font-semibold text-lg">Chỉ đường</h3>
                <div className="flex items-center gap-2">
                  {/* Voice Toggle Button */}
                  <button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={`p-2 rounded-lg transition-colors ${
                      voiceEnabled
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                    title={voiceEnabled ? 'Tắt giọng nói' : 'Bật giọng nói'}
                  >
                    {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => { setShowNavigation(false); setRoute(null); setCurrentStepIndex(0); setLastAnnouncedStep(-1); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Origin & Destination */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-700 text-sm truncate">{navigationOrigin?.name}</span>
                </div>
                <div className="w-0.5 h-4 bg-gray-200 ml-1.5"></div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-gray-700 text-sm truncate">{navigationDest?.name}</span>
                </div>
              </div>

              {/* Transport Mode */}
              <div className="flex gap-2 mt-4">
                {transportModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedTransport(mode)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors ${
                      selectedTransport.id === mode.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <mode.icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Route Info */}
            {leg && (
              <>
                <div className="p-4 bg-blue-50 flex items-center justify-around">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold">{formatDuration(leg.duration.value)}</span>
                  </div>
                  <div className="w-px h-6 bg-blue-200"></div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <Route className="w-5 h-5" />
                    <span className="font-semibold">{formatDistance(leg.distance.value)}</span>
                  </div>
                </div>

                {/* Steps */}
                <div className="flex-1 overflow-y-auto p-4">
                  <button
                    onClick={() => setShowRouteSteps(!showRouteSteps)}
                    className="w-full flex items-center justify-between py-2 text-gray-600"
                  >
                    <span className="text-sm font-medium">Hướng dẫn chi tiết</span>
                    {showRouteSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showRouteSteps && (
                    <div className="space-y-3 mt-2">
                      {leg.steps.map((step, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-gray-700" dangerouslySetInnerHTML={{ __html: step.html_instructions }} />
                            <p className="text-gray-400 text-xs mt-0.5">{step.distance.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Nearby Places Panel */}
        {showNearbyPanel && nearbyPlaces.length > 0 && (
          <div className="absolute top-16 right-4 z-10 w-80 bg-white rounded-xl shadow-xl max-h-96 overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <h4 className="text-gray-900 font-medium">
                {nearbyCategories.find(c => c.id === selectedNearbyCategory)?.label} gần đây
              </h4>
              <button
                onClick={() => { setShowNearbyPanel(false); setNearbyPlaces([]); setSelectedNearbyCategory(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {nearbyPlaces.map((place) => (
                <div
                  key={place.place_id}
                  onClick={() => 
{
                    setSelectedPlace({
                      id: place.place_id,
                      name: place.name,
                      address: place.formatted_address,
                      lat: place.geometry.location.lat,
                      lng: place.geometry.location.lng
                    });
                    mapInstanceRef.current?.flyTo({
                      center: [place.geometry.location.lng, place.geometry.location.lat],
                      zoom: 17
                    });
                  }}
                  className="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                >
                  <p className="text-gray-900 text-sm font-medium">{place.name}</p>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-1">{place.formatted_address}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-gray-900 font-semibold">Chia sẻ địa điểm</h3>
                <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-gray-600 text-sm mb-3">{selectedPlace?.name}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white/70">Đang tải bản đồ...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPage;
