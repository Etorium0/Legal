import React, { useState } from 'react';
import Button from './ui/button';

type Props = {
  onSubmit: (text: string) => void;
  onStartVoice: () => void;
  disabled?: boolean;
};

export const QueryBox: React.FC<Props> = ({ onSubmit, onStartVoice, disabled }) => 
{
  const [text, setText] = useState('');

  return (
    <div className="w-full mx-auto">
      <div className="flex items-center gap-2 rounded-full border border-white/15 bg-neutral-900/80 px-3 py-2 text-white shadow-lg shadow-black/30">
        <span aria-hidden className="ml-1">🔎</span>
        <input
          type="text"
          className="flex-1 bg-transparent outline-none placeholder-white/60"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => 
{
            if (e.key === 'Enter' && !disabled) { onSubmit(text); setText(''); }
          }}
          placeholder="Đặt câu hỏi (tối đa 500 ký tự)"
          disabled={disabled}
        />
        <Button onClick={() => onStartVoice()} aria-label="voice" variant="primary" size="icon" title="Ghi âm">
          🎙️
        </Button>
        <Button
          onClick={() => { if (!disabled) { onSubmit(text); setText(''); } }}
          variant="secondary"
          size="md"
        >
          Gửi
        </Button>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-white/60">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Trạng thái: {disabled ? 'Đang xử lý' : 'Sẵn sàng'}
        </span>
        <span>{text.length}/500</span>
      </div>
    </div>
  );
};

export default QueryBox;
