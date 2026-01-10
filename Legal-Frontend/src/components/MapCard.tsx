import React, { useState } from 'react';
import { Navigation, MapPin, ExternalLink, Map } from 'lucide-react';

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyDxZOEx_qsBtCl7LNzZsebM2c1AXkwD9b4';

export type MapLocation = {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  note?: string;
};

export type MapCardProps = {
  locations?: MapLocation[];
  height?: number;
  showNavButton?: boolean;
};

// Các địa điểm hỗ trợ pháp lý gần UIT và các khu vực chính
const defaultLocations: MapLocation[] = [
  {
    name: 'Trung tâm trợ giúp pháp lý TP.HCM',
    address: '470 Nguyễn Tri Phương, P.9, Q.10, TP.HCM',
    lat: 10.7628,
    lng: 106.6669,
    note: 'Miễn phí cho sinh viên, người thu nhập thấp',
  },
  {
    name: 'Sở Tư pháp TP.HCM',
    address: '141-143 Pasteur, P.6, Q.3, TP.HCM',
    lat: 10.7769,
    lng: 106.6925,
    note: 'Tiếp công dân, giải đáp thắc mắc pháp luật',
  },
  {
    name: 'Tòa án nhân dân TP.HCM',
    address: '131 Nam Kỳ Khởi Nghĩa, P.7, Q.3, TP.HCM',
    lat: 10.7811,
    lng: 106.6893,
    note: 'Tra cứu án lệ, tiếp nhận khiếu nại',
  },
  {
    name: 'Trường ĐH CNTT - UIT',
    address: 'Khu phố 6, P.Linh Trung, TP.Thủ Đức',
    lat: 10.8700,
    lng: 106.8031,
    note: 'Nơi phát triển ứng dụng này 🎓',
  },
];

// Gọi Native Bridge để mở Google Maps app
const openGoogleMapsNavigation = (location: MapLocation) => {
  const destination = location.lat && location.lng 
    ? `${location.lat},${location.lng}`
    : encodeURIComponent(location.address);
  
  // URL cho Google Maps navigation
  const mapsUrl = location.lat && location.lng
    ? `google.navigation:q=${location.lat},${location.lng}`
    : `google.navigation:q=${encodeURIComponent(location.address)}`;
  
  // Fallback URL cho web
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

  // Gửi command tới Native Bridge (Android)
  if (typeof window !== 'undefined' && (window as any).NativeBridge) {
    (window as any).NativeBridge.postMessage(JSON.stringify({
      type: 'command',
      name: 'openUrl',
      data: { url: mapsUrl }
    }));
  } else {
    // Fallback: mở trong browser/webview
    window.open(webUrl, '_blank');
  }
};

// Mở Google Maps để xem vị trí (không navigation)
const openGoogleMapsView = (location: MapLocation) => {
  const query = location.lat && location.lng 
    ? `${location.lat},${location.lng}`
    : encodeURIComponent(location.address);
  
  const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
  
  if (typeof window !== 'undefined' && (window as any).NativeBridge) {
    (window as any).NativeBridge.postMessage(JSON.stringify({
      type: 'command',
      name: 'openUrl',
      data: { url }
    }));
  } else {
    window.open(url, '_blank');
  }
};

export default function MapCard({
  locations = defaultLocations,
  height = 200,
  showNavButton = true,
}: MapCardProps) 
{
  const [selected, setSelected] = useState(locations[0]);
  const [showEmbeddedMap, setShowEmbeddedMap] = useState(false);

  // Build Google Maps embed URL
  const getEmbedUrl = (location: MapLocation) => {
    const q = location.lat && location.lng 
      ? `${location.lat},${location.lng}`
      : encodeURIComponent(location.address);
    return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${q}&zoom=15&language=vi`;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Hỗ trợ pháp lý</p>
          <h3 className="text-xl font-semibold text-white mt-1">Tìm địa điểm gần bạn</h3>
          <p className="text-sm text-white/60 mt-1">Chọn địa điểm và nhấn "Dẫn đường" để đi.</p>
        </div>
        {/* Toggle embedded map */}
        <button
          onClick={() => setShowEmbeddedMap(!showEmbeddedMap)}
          className={`p-2 rounded-lg transition-all ${
            showEmbeddedMap 
              ? 'bg-emerald-500/30 text-emerald-300' 
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
          title={showEmbeddedMap ? 'Ẩn bản đồ' : 'Xem bản đồ'}
        >
          <Map className="w-5 h-5" />
        </button>
      </div>

      {/* Embedded Google Maps - shows when toggled */}
      {showEmbeddedMap && (
        <div className="mb-4 rounded-xl overflow-hidden border border-white/10">
          <iframe
            title="Google Maps"
            width="100%"
            height={height}
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={getEmbedUrl(selected)}
          />
        </div>
      )}

      {/* Location Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {locations.map((loc) => (
          <button
            key={loc.name}
            onClick={() => setSelected(loc)}
            className={`px-3 py-2 rounded-xl text-xs border transition-all ${
              loc.name === selected.name
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 scale-105'
                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
            }`}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Selected Location Card */}
      <div className="bg-slate-800/80 border border-white/10 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white">{selected.name}</div>
            <div className="text-sm text-white/70 mt-1">{selected.address}</div>
            {selected.note && (
              <div className="text-xs text-emerald-400/80 mt-2 bg-emerald-500/10 px-2 py-1 rounded inline-block">
                💡 {selected.note}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {showNavButton && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => openGoogleMapsNavigation(selected)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-medium hover:from-emerald-500 hover:to-green-500 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Navigation className="w-5 h-5" />
              Dẫn đường
            </button>
            <button
              onClick={() => openGoogleMapsView(selected)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all border border-white/10"
            >
              <ExternalLink className="w-4 h-4" />
              Xem map
            </button>
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="mt-4 text-xs text-white/50 text-center">
        💬 Hỏi trợ lý: "Tìm trung tâm trợ giúp pháp lý gần đây"
      </div>
    </div>
  );
}
