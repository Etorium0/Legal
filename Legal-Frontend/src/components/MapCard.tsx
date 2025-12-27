import React, { useMemo, useState } from 'react';

export type MapLocation = {
  name: string;
  address: string;
  query?: string;
  note?: string;
};

export type MapCardProps = {
  locations?: MapLocation[];
  zoom?: number;
  height?: number;
  apiKey?: string;
};

const defaultLocations: MapLocation[] = [
  {
    name: 'Văn phòng Hà Nội',
    address: '18 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội',
    query: '18 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội',
    note: 'Liên hệ pháp lý, tiếp nhận hồ sơ',
  },
  {
    name: 'Văn phòng TP. HCM',
    address: '19 Nguyễn Thị Minh Khai, Quận 1, Hồ Chí Minh',
    query: '19 Nguyễn Thị Minh Khai, Quận 1, Hồ Chí Minh',
    note: 'Tư vấn doanh nghiệp, dân sự',
  },
];

export default function MapCard({
  locations = defaultLocations,
  zoom = 16,
  height = 360,
  apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined,
}: MapCardProps) 
{
  const [selected, setSelected] = useState(locations[0]);

  const mapSrc = useMemo(() => 
  {
    const query = encodeURIComponent(selected.query || selected.address || selected.name);
    if (apiKey) 
    {
      return `https://www.google.com/maps/embed/v1/search?key=${apiKey}&q=${query}&zoom=${zoom}`;
    }
    return `https://www.google.com/maps?q=${query}&output=embed`;
  }, [selected, apiKey, zoom]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Google Maps</p>
          <h3 className="text-xl font-semibold text-white mt-1">Định vị văn phòng</h3>
          <p className="text-sm text-white/60 mt-1">Xem nhanh vị trí và dẫn đường tới các cơ sở hỗ trợ.</p>
        </div>
        {!apiKey && (
          <span className="text-[11px] px-2 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/40">
            Thiếu VITE_GOOGLE_MAPS_API_KEY (dùng iframe fallback)
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {locations.map((loc) => (
          <button
            key={loc.name}
            onClick={() => setSelected(loc)}
            className={`px-3 py-2 rounded-xl text-sm border transition-colors ${
              loc.name === selected.name
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
            }`}
          >
            {loc.name}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr]">
        <div className="w-full overflow-hidden rounded-xl border border-white/10 shadow-inner">
          <iframe
            title={`Bản đồ - ${selected.name}`}
            src={mapSrc}
            width="100%"
            height={height}
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
          />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-start gap-3">
          <div className="text-2xl">📍</div>
          <div className="space-y-1 text-sm text-white/80">
            <div className="font-semibold text-white">{selected.name}</div>
            <div>{selected.address}</div>
            {selected.note && <div className="text-white/60">{selected.note}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
