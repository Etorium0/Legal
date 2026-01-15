import React, { useEffect, useRef, useState } from 'react';
import { X, Navigation, Clock, Route, Locate } from 'lucide-react';

const GOONG_API_KEY = import.meta.env.VITE_GOONG_API_KEY as string;
const GOONG_MAP_KEY = import.meta.env.VITE_GOONG_MAP_KEY as string;

interface GoongMapProps {
  destination?: string;
  destinationCoords?: [number, number];
  onClose: () => void;
  showNavigation?: boolean;
}

interface GoongRoute {
  overview_polyline: {
    points: string;
  };
  legs: Array<{
    distance: { value: number; text: string };
    duration: { value: number; text: string };
    steps: Array<{
      distance: { value: number; text: string };
      html_instructions: string;
      maneuver: string;
    }>;
  }>;
}

const GoongMap: React.FC<GoongMapProps> = ({
  destination,
  destinationCoords,
  onClose,
  showNavigation = true
}) => 
{

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(destinationCoords || null);
  const [route, setRoute] = useState<GoongRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [destinationName, setDestinationName] = useState(destination || '');

  /* ================= LOAD SDK ================= */

  useEffect(() => 
{
    if ((window as any).goongjs) 
{
      setLoading(false);
      return;
    }

    const link = document.createElement('link');
    link.href = 'https://cdn.goong.io/sdk/goong-js-1.0.9.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdn.goong.io/sdk/goong-js-1.0.9.js';
    script.async = true;
    script.onload = () => setLoading(false);
    script.onerror = () => 
{
      setError('Không thể tải Goong Maps SDK');
      setLoading(false);
    };
    document.body.appendChild(script);

    return () => 
{
      document.body.removeChild(script);
      document.head.removeChild(link);
    };
  }, []);

  /* ================= CURRENT LOCATION ================= */

  useEffect(() => 
{
    if (!navigator.geolocation) 
{
      setCurrentLocation([106.7009, 10.7769]);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => 
{
        setCurrentLocation([pos.coords.longitude, pos.coords.latitude]);
      },
      () => 
{
        setCurrentLocation([106.7009, 10.7769]);
        setError('Không thể lấy vị trí, dùng vị trí mặc định.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  /* ================= GEOCODE ================= */

  useEffect(() => 
{
    if (!destination || destCoords) {return;}

    const geocode = async () => 
{
      try 
{
        const res = await fetch(
          `https://rsapi.goong.io/geocode?address=${encodeURIComponent(destination)}&api_key=${GOONG_API_KEY}`
        );
        const data = await res.json();

        if (data.results?.length) 
{
          const loc = data.results[0].geometry.location;
          setDestCoords([loc.lng, loc.lat]);
          setDestinationName(data.results[0].formatted_address);
        }
 else 
{
          setError('Không tìm thấy địa điểm');
        }
      }
 catch 
{
        setError('Lỗi geocode');
      }
    };

    geocode();
  }, [destination, destCoords]);

  /* ================= ROUTE ================= */

  useEffect(() => 
{
    if (!currentLocation || !destCoords || !showNavigation) {return;}

    const getRoute = async () => 
{
      try 
{
        const origin = `${currentLocation[1]},${currentLocation[0]}`;
        const dest = `${destCoords[1]},${destCoords[0]}`;

        const res = await fetch(
          `https://rsapi.goong.io/Direction?origin=${origin}&destination=${dest}&vehicle=car&api_key=${GOONG_API_KEY}`
        );

        const data = await res.json();

        if (data.routes?.length) 
{
          setRoute(data.routes[0]);
        }
 else 
{
          setError('Không tìm thấy đường đi');
        }
      }
 catch 
{
        setError('Lỗi tìm đường');
      }
    };

    getRoute();
  }, [currentLocation, destCoords, showNavigation]);

  /* ================= MAP INIT ================= */

  useEffect(() => 
{
    if (loading || !mapRef.current || !(window as any).goongjs || !currentLocation) {return;}

    const goongjs = (window as any).goongjs;
    goongjs.accessToken = GOONG_MAP_KEY;

    const map = new goongjs.Map({
      container: mapRef.current,
      style: 'https://tiles.goong.io/assets/goong_map_web.json',
      center: currentLocation,
      zoom: 13,
    });

    map.on('load', () => 
{
      new goongjs.Marker({ color: '#3b82f6' }).setLngLat(currentLocation).addTo(map);

      if (destCoords) 
{
        new goongjs.Marker({ color: '#ef4444' }).setLngLat(destCoords).addTo(map);

        const bounds = new goongjs.LngLatBounds();
        bounds.extend(currentLocation);
        bounds.extend(destCoords);
        map.fitBounds(bounds, { padding: 80 });
      }

      if (route?.overview_polyline?.points) 
{
        const coords = decodePolyline(route.overview_polyline.points);

        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: coords,
            },
          },
        });

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          paint: {
            'line-width': 6,
            'line-opacity': 0.85,
            'line-color': '#3b82f6',
          },
        });
      }
    });

    mapInstanceRef.current = map;
    return () => map.remove();
  }, [loading, currentLocation, destCoords, route]);

  /* ================= HELPERS ================= */

  const decodePolyline = (str: string) => 
{
    let i = 0, lat = 0, lng = 0, coordinates: number[][] = [];

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

  const formatDistance = (m: number) => m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
  const formatDuration = (s: number) => 
{
    const min = Math.round(s / 60);
    if (min < 60) {return `${min} phút`;}
    return `${Math.floor(min / 60)}h ${min % 60}p`;
  };

  const recenterMap = () => 
{
    if (mapInstanceRef.current && currentLocation) 
{
      mapInstanceRef.current.flyTo({ center: currentLocation, zoom: 15 });
    }
  };

  const leg = route?.legs?.[0];

  /* ================= UI ================= */

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* HEADER */}
      <div className="bg-blue-700 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-lg">Goong Maps</h2>
          <p className="text-sm opacity-80">
            {destinationName || destination || 'Xem bản đồ'}
          </p>
        </div>
        <button onClick={onClose}><X /></button>
      </div>

      {error && (
        <div className="bg-red-900 text-red-100 text-sm px-4 py-2">
          {error}
        </div>
      )}

      {/* INFO */}
      {leg && showNavigation && (
        <div className="bg-gray-900 text-white py-3 flex justify-around">
          <div className="flex gap-2 items-center text-green-400">
            <Clock /> {formatDuration(leg.duration.value)}
          </div>
          <div className="flex gap-2 items-center text-blue-400">
            <Route /> {formatDistance(leg.distance.value)}
          </div>
        </div>
      )}

      {/* MAP */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="absolute inset-0" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center text-white">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm">Đang tải bản đồ...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center text-white px-4">
              <p className="text-red-300 mb-3">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
        <button
          onClick={recenterMap}
          className="absolute bottom-24 right-4 bg-white p-3 rounded-full shadow-lg"
        >
          <Locate className="text-blue-600" />
        </button>
      </div>

      {/* STEPS */}
      {leg && showNavigation && (
        <div className="bg-gray-900 text-white max-h-56 overflow-y-auto p-4">
          <h3 className="font-semibold mb-2">Hướng dẫn đường đi</h3>
          <ol className="space-y-2 text-sm">
            {leg.steps.slice(0, 12).map((s, i) => (
              <li key={i}>
                <span className="text-blue-400 font-semibold mr-1">{i + 1}.</span>
                <span dangerouslySetInnerHTML={{ __html: s.html_instructions }} />
                <span className="text-gray-400 text-xs"> ({formatDistance(s.distance.value)})</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="bg-gray-900 text-center text-xs text-gray-500 py-2">
        Powered by Goong Maps
      </div>
    </div>
  );
};

export default GoongMap;
