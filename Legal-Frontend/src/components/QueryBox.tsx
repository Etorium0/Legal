import React, { useState } from 'react';

type Props = {
  onSubmit: (text: string) => void;
  onStartVoice: () => void;
  disabled?: boolean;
};

export const QueryBox: React.FC<Props> = ({ onSubmit, onStartVoice, disabled }) => {
  const [text, setText] = useState('');

  return (
    <div className="w-full max-w-3xl mx-auto flex items-center gap-3">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit(text)}
        className="flex-1 border rounded-lg px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Hỏi luật bằng văn bản hoặc bấm mic để nói..."
        disabled={disabled}
      />
      <button
        onClick={() => onStartVoice()}
        aria-label="voice"
        className="p-3 rounded-full bg-indigo-600 text-white shadow hover:bg-indigo-700"
      >
        🎙️
      </button>
      <button
        onClick={() => { onSubmit(text); setText(''); }}
        className="px-4 py-2 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600"
      >
        Gửi
      </button>
    </div>
  );
};

export default QueryBox;
