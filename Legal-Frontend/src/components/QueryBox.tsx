import React, { useState } from 'react';
import Input from './ui/input';
import Button from './ui/button';

type Props = {
  onSubmit: (text: string) => void;
  onStartVoice: () => void;
  disabled?: boolean;
};

export const QueryBox: React.FC<Props> = ({ onSubmit, onStartVoice, disabled }) => {
  const [text, setText] = useState('');

  return (
    <div className="w-full max-w-3xl mx-auto flex items-center gap-3">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit(text)}
        placeholder="Hỏi luật bằng văn bản hoặc bấm mic để nói..."
        disabled={disabled}
        leadingIcon={<span>🔎</span>}
      />
      <Button
        onClick={() => onStartVoice()}
        aria-label="voice"
        variant="primary"
        size="md"
        title="Ghi âm"
      >
        🎙️
      </Button>
      <Button
        onClick={() => { onSubmit(text); setText(''); }}
        variant="secondary"
        size="md"
      >
        Gửi
      </Button>
    </div>
  );
};

export default QueryBox;
