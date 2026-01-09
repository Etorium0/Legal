import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { X, Navigation, Clock, Route, Locate } from 'lucide-react';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface NavigationMapProps {
  destination: string;
  onClose: () => void;
}

interface RouteInfo {
  distance: string;
  duration: string;
  instructions: string[];
}

// Component để điều khiển routing
function RoutingMachine({ 
  start, 
  end, 
  onRouteFound 
}: { 
  start: [number, number]; 
  end: [number, number]; 
  onRouteFound: (info: RouteInfo) => void;
}) 
{
  const map = useMap();
  const routingControlRef = useRef<L.Routing.Control | null>(null);

  useEffect(() => 
{
    if (!map || !start || !end) {return;}

    // Xóa routing cũ nếu có
    if (routingControlRef.current) 
{
      map.removeControl(routingControlRef.current);
    }

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(start[0], start[1]),
        L.latLng(end[0], end[1])
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      lineOptions: {
        styles: [{ color: '#3b82f6', weight: 6, opacity: 0.8 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      // Hide the default itinerary panel
      show: false,
      createMarker: () => null, // We'll use custom markers
    }).addTo(map);

    routingControl.on('routesfound', (e: any) => 
{
      const routes = e.routes;
      if (routes && routes.length > 0) 
{
        const route = routes[0];
        const distanceKm = (route.summary.totalDistance / 1000).toFixed(1);
        const durationMin = Math.round(route.summary.totalTime / 60);
        
        const instructions = route.instructions?.slice(0, 10).map((inst: any) => inst.text) || [];
        
        onRouteFound({
          distance: `${distanceKm} km`,
          duration: `${durationMin} phút`,
          instructions
        });
      }
    });

    routingControlRef.current = routingControl;

    return () => 
{
      if (routingControlRef.current) 
{
        map.removeControl(routingControlRef.current);
      }
    };
  }, [map, start, end, onRouteFound]);

  return null;
}

// Component để fit bounds
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) 
{
  const map = useMap();
  
  useEffect(() => 
{
    if (bounds) 
{
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);

  return null;
}

const NavigationMap: React.FC<NavigationMapProps> = ({ destination, onClose }) => 
{
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [destinationName, setDestinationName] = useState(destination);

  // Lấy vị trí hiện tại
  useEffect(() => 
{
    if (navigator.geolocation) 
{
      navigator.geolocation.getCurrentPosition(
        (position) => 
{
          setCurrentLocation([position.coords.latitude, position.coords.longitude]);
        },
        (err) => 
{
          console.error('Geolocation error:', err);
          // Default to Ho Chi Minh City center if geolocation fails
          setCurrentLocation([10.7769, 106.7009]);
          setError('Không thể lấy vị trí hiện tại. Sử dụng vị trí mặc định.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
 else 
{
      setCurrentLocation([10.7769, 106.7009]);
      setError('Trình duyệt không hỗ trợ định vị.');
    }
  }, []);

  // Geocode destination
  useEffect(() => 
{
    const geocodeDestination = async () => 
{
      try 
{
        // Thêm "Vietnam" vào query để kết quả chính xác hơn
        const query = destination.toLowerCase().includes('việt nam') || destination.toLowerCase().includes('vietnam')
          ? destination
          : `${destination}, Vietnam`;
          
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
        );
        const data = await response.json();
        
        if (data && data.length > 0) 
{
          setDestinationCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          setDestinationName(data[0].display_name.split(',').slice(0, 3).join(', '));
          setLoading(false);
        }
 else 
{
          setError(`Không tìm thấy địa điểm "${destination}"`);
          setLoading(false);
        }
      }
 catch (err) 
{
        console.error('Geocoding error:', err);
        setError('Lỗi khi tìm kiếm địa điểm');
        setLoading(false);
      }
    };

    if (destination) 
{
      geocodeDestination();
    }
  }, [destination]);

  const handleRouteFound = (info: RouteInfo) => 
{
    setRouteInfo(info);
  };

  const bounds = currentLocation && destinationCoords
    ? L.latLngBounds([currentLocation, destinationCoords])
    : null;

  // Custom marker icons
  const currentLocationIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  const destinationIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Navigation className="w-6 h-6" />
          <div>
            <h2 className="font-semibold text-lg">Chỉ đường</h2>
            <p className="text-sm text-blue-100 truncate max-w-[250px]">{destinationName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Route Info Bar */}
      {routeInfo && (
        <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-around border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-400" />
            <span className="text-xl font-bold text-green-400">{routeInfo.duration}</span>
          </div>
          <div className="w-px h-8 bg-gray-600"></div>
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-blue-400" />
            <span className="text-lg">{routeInfo.distance}</span>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-white">Đang tìm đường...</p>
            </div>
          </div>
        ) : error && !destinationCoords ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white p-4">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : currentLocation ? (
          <MapContainer
            center={currentLocation}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Current Location Marker */}
            <Marker position={currentLocation} icon={currentLocationIcon}>
              <Popup>
                <div className="text-center">
                  <Locate className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                  <span className="font-medium">Vị trí của bạn</span>
                </div>
              </Popup>
            </Marker>

            {/* Destination Marker */}
            {destinationCoords && (
              <Marker position={destinationCoords} icon={destinationIcon}>
                <Popup>
                  <div className="text-center max-w-[200px]">
                    <Navigation className="w-4 h-4 mx-auto mb-1 text-red-500" />
                    <span className="font-medium">{destinationName}</span>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Routing */}
            {destinationCoords && (
              <RoutingMachine
                start={currentLocation}
                end={destinationCoords}
                onRouteFound={handleRouteFound}
              />
            )}

            {/* Fit bounds */}
            <FitBounds bounds={bounds} />
          </MapContainer>
        ) : null}

        {/* Floating locate button */}
        <button
          onClick={() => 
{
            if (navigator.geolocation) 
{
              navigator.geolocation.getCurrentPosition(
                (position) => 
{
                  setCurrentLocation([position.coords.latitude, position.coords.longitude]);
                },
                () => {}
              );
            }
          }}
          className="absolute bottom-24 right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors z-[1000]"
        >
          <Locate className="w-6 h-6 text-blue-600" />
        </button>
      </div>

      {/* Instructions Panel */}
      {routeInfo && routeInfo.instructions.length > 0 && (
        <div className="bg-gray-900 text-white p-4 max-h-48 overflow-y-auto border-t border-gray-700">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Route className="w-4 h-4" />
            Hướng dẫn đường đi
          </h3>
          <ol className="space-y-2 text-sm">
            {routeInfo.instructions.map((instruction, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-blue-400 font-medium">{idx + 1}.</span>
                <span className="text-gray-300">{instruction}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default NavigationMap;
