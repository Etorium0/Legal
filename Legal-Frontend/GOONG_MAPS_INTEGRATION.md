# Goong Maps Integration Guide

## Tổng quan

Dự án Legal Support đã tích hợp **Goong.io Maps** - nền tảng bản đồ số #1 Việt Nam với dữ liệu địa phương chính xác và API mạnh mẽ.

## Tính năng

### 1. Goong Maps Component (`GoongMap.tsx`)

Component map đầy đủ tính năng với:
- ✅ Interactive map với Goong SDK
- ✅ Current location detection (GPS)
- ✅ Geocoding (tìm tọa độ từ địa chỉ)
- ✅ Directions/Routing (chỉ đường)
- ✅ Turn-by-turn instructions (hướng dẫn từng bước)
- ✅ Distance & duration calculation
- ✅ Custom markers
- ✅ Polyline route visualization
- ✅ Mobile-optimized UI

### 2. MapCard Component (Updated)

Widget gọn nhẹ hiển thị locations với:
- 🗺️ Goong Maps modal khi click "Dẫn đường" hoặc "Xem map"
- 📍 Danh sách các địa điểm hỗ trợ pháp lý
- 🎯 Location pills để chọn nhanh
- 💡 Tips và notes cho mỗi địa điểm

## API Keys

```typescript
// Goong API Key (cho Geocoding & Directions API)
GOONG_API_KEY = 'SPoWZ5SpgkD3oQ2vUTDVvm9Xp9cxMP8DPG4kAoGK'

// Goong Map Tiles Key (cho Map rendering)
GOONG_MAP_KEY = 'JcGKlkwBHqSHUvkmtznCOV3dxhydYcKuUd4RJQVW'
```

⚠️ **Lưu ý**: Keys này nên được lưu trong `.env` file trong production:
```env
VITE_GOONG_API_KEY=your_api_key
VITE_GOONG_MAP_KEY=your_map_key
```

## Cách sử dụng

### Import GoongMap Component

```tsx
import GoongMap from './components/GoongMap';

function MyComponent() {
  const [showMap, setShowMap] = useState(false);

  return (
    <>
      <button onClick={() => setShowMap(true)}>
        Xem bản đồ
      </button>

      {showMap && (
        <GoongMap
          destination="Sở Tư pháp TP.HCM"
          onClose={() => setShowMap(false)}
          showNavigation={true}
        />
      )}
    </>
  );
}
```

### Props API

```typescript
interface GoongMapProps {
  destination?: string;              // Địa chỉ đích (sẽ geocode tự động)
  destinationCoords?: [number, number]; // Hoặc tọa độ trực tiếp [lng, lat]
  onClose: () => void;               // Callback khi đóng map
  showNavigation?: boolean;          // Hiện routing hay chỉ xem map
}
```

### Sử dụng với MapCard

MapCard đã được update tự động:

```tsx
import MapCard from './components/MapCard';

function Dashboard() {
  return (
    <MapCard
      locations={[
        {
          name: 'Sở Tư pháp TP.HCM',
          address: '141-143 Pasteur, P.6, Q.3, TP.HCM',
          lat: 10.7769,
          lng: 106.6925,
          note: 'Tiếp công dân, giải đáp thắc mắc pháp luật'
        }
      ]}
      showNavButton={true}
    />
  );
}
```

## API Endpoints sử dụng

### 1. Goong Geocoding API
```
GET https://rsapi.goong.io/geocode
  ?address={address}
  &api_key={GOONG_API_KEY}
```

Trả về tọa độ của địa chỉ.

### 2. Goong Directions API
```
GET https://rsapi.goong.io/Direction
  ?origin={lat},{lng}
  &destination={lat},{lng}
  &vehicle=car
  &api_key={GOONG_API_KEY}
```

Trả về:
- `distance`: khoảng cách (meters)
- `duration`: thời gian (seconds)
- `geometry`: encoded polyline
- `legs[].steps[]`: hướng dẫn từng bước

### 3. Goong Map Tiles
```
https://tiles.goong.io/assets/goong_map_web.json
```

Style JSON cho Goong JS SDK.

## So sánh với Google Maps

| Feature | Google Maps | Goong Maps |
|---------|-------------|------------|
| Dữ liệu Việt Nam | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Địa chỉ phố nhỏ | Limited | Excellent |
| API Cost | $$ | $ |
| Tiếng Việt | Good | Native |
| POI Việt Nam | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Mobile Performance | Good | Excellent |

## Ví dụ đầy đủ

```tsx
import React, { useState } from 'react';
import GoongMap from './components/GoongMap';
import { Navigation } from 'lucide-react';

function LegalAssistantMap() {
  const [showMap, setShowMap] = useState(false);

  const legalCenters = [
    {
      name: 'Trung tâm trợ giúp pháp lý TP.HCM',
      address: '470 Nguyễn Tri Phương, P.9, Q.10, TP.HCM',
      coords: [106.6669, 10.7628] as [number, number]
    },
    {
      name: 'Sở Tư pháp TP.HCM',
      address: '141-143 Pasteur, P.6, Q.3, TP.HCM',
      coords: [106.6925, 10.7769] as [number, number]
    }
  ];

  const [selected, setSelected] = useState(legalCenters[0]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Tìm trung tâm hỗ trợ pháp lý gần bạn
      </h2>

      {/* Location selector */}
      <div className="flex gap-2 mb-4">
        {legalCenters.map(center => (
          <button
            key={center.name}
            onClick={() => setSelected(center)}
            className={`px-4 py-2 rounded ${
              selected.name === center.name
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800'
            }`}
          >
            {center.name}
          </button>
        ))}
      </div>

      {/* Map trigger button */}
      <button
        onClick={() => setShowMap(true)}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg"
      >
        <Navigation className="w-5 h-5" />
        Dẫn đường đến {selected.name}
      </button>

      {/* Goong Map Modal */}
      {showMap && (
        <GoongMap
          destination={selected.address}
          destinationCoords={selected.coords}
          onClose={() => setShowMap(false)}
          showNavigation={true}
        />
      )}
    </div>
  );
}
```

## Mobile Optimization

Goong Maps được tối ưu cho mobile:

1. **Touch gestures**: Pan, zoom, rotate
2. **GPS integration**: Tự động lấy vị trí hiện tại
3. **Responsive UI**: Fullscreen modal trên mobile
4. **Performance**: Vector tiles load nhanh
5. **Offline mode**: Cache tiles (có thể enable)

## Troubleshooting

### Map không hiển thị
- Kiểm tra API keys có đúng không
- Kiểm tra network requests trong DevTools
- Verify Goong SDK đã load: `window.goongjs`

### Geocoding không tìm thấy địa chỉ
- Thêm "Vietnam" vào query: `"${address}, Vietnam"`
- Sử dụng tọa độ trực tiếp nếu có
- Kiểm tra format địa chỉ

### Routing không hoạt động
- Verify origin và destination có tọa độ hợp lệ
- Kiểm tra distance có quá xa không (> 500km)
- Thử vehicle type khác: `car`, `bike`, `taxi`

### Performance issues
- Enable tile caching
- Reduce polyline complexity
- Lazy load map component
- Use React.memo for optimization

## Future Enhancements

- [ ] Offline map tiles caching
- [ ] Multi-stop routing (waypoints)
- [ ] Real-time traffic data
- [ ] Alternative routes
- [ ] Places search autocomplete
- [ ] Save favorite locations
- [ ] Share location feature
- [ ] Voice-guided navigation

## Tài liệu tham khảo

- [Goong Maps Documentation](https://docs.goong.io/)
- [Goong JS SDK](https://docs.goong.io/javascript/)
- [Goong Directions API](https://docs.goong.io/rest/directions/)
- [Goong Geocoding API](https://docs.goong.io/rest/geocode/)

## License

API keys trong document này chỉ dùng cho development. Production cần đăng ký keys riêng tại [goong.io](https://goong.io).
