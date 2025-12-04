import React, { useEffect, useState } from 'react'

type Props = {
  onSend: (text: string) => void
  onUpload?: (file: File) => void
  maxChars?: number
}

export const ChatInput: React.FC<Props> = ({ onSend, onUpload, maxChars = 500 }) => 
{
  const [text, setText] = useState('')
  const [count, setCount] = useState(0)

  useEffect(() => 
{
    setCount(text.length)
  }, [text])

  function handleSend() 
{
    if (!text.trim()) {return}
    onSend(text.trim())
    setText('')
  }

  return (
    <div className="w-full p-3 md:p-4 border-t border-white/10 bg-bg/80 backdrop-blur sticky bottom-0">
      <div className="flex items-end gap-3">
        <label className="flex items-center justify-center h-11 w-11 rounded-xl bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer" aria-label="Tải tệp">
          <input
            type="file"
            hidden
            onChange={(e) => 
{
              const f = e.target.files?.[0]
              if (f) {onUpload?.(f)}
            }}
          />
          📎
        </label>

        <div className="flex-1">
          <div className="rounded-xl bg-white/5 border border-white/10 focus-within:border-primary/40">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxChars))}
              placeholder="Đặt câu hỏi"
              className="w-full resize-none bg-transparent outline-none text-white/90 placeholder:text-white/50 px-4 py-3 h-14"
              aria-label="Ô nhập câu hỏi"
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-white/50">{count}/{maxChars}</span>
            <button
              onClick={handleSend}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white hover:opacity-90 transition-opacity shadow-soft"
              aria-label="Gửi câu hỏi"
            >
              ✈️ <span>Gửi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInput
