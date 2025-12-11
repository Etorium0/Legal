import React from 'react';

interface GesturePlayerProps {
  videoUrl: string;
  onClose?: () => void;
}

const GesturePlayer: React.FC<GesturePlayerProps> = ({ videoUrl, onClose }) => 
{
  return (
    <div className="w-full max-w-3xl mt-4 bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
        <div className="text-sm font-semibold text-gray-700">Cử chỉ đồng bộ theo lời nói</div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
          >
            Ẩn
          </button>
        )}
      </div>
      <div className="aspect-video bg-black">
        <video src={videoUrl} className="w-full h-full" controls playsInline />
      </div>
      <div className="px-4 py-2 text-xs text-gray-500">Nguồn: Dịch vụ PantoMatrix (EMAGE/CaMN/DisCo)</div>
    </div>
  );
};

export default GesturePlayer;
