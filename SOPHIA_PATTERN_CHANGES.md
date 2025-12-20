# 🎯 Sophia Pattern Implementation

## Thay đổi từ Wake Word Continuous → Click-to-Talk (Giống Siri/Sophia)

### ✅ ĐÃ SỬA

#### 1. **audioService.ts** - Blocking Listening với Timeout
```typescript
// TRƯỚC (Continuous, không tự dừng)
this.recognition.continuous = false;
this.recognition.interimResults = true;

// SAU (Blocking + Auto-timeout như Sophia)
this.recognition.continuous = false;  // ✅ Không continuous
this.recognition.interimResults = true;

// ✅ THÊM: Global timeout (10s)
this.listeningTimeout = setTimeout(() => {
    this.stopListening();
}, 10000);

// ✅ THÊM: Phrase timeout (6s sau khi bắt đầu nói)
if (!firstSpeechDetected && (finalTranscript || interimTranscript)) {
    firstSpeechDetected = true;
    this.phraseTimeout = setTimeout(() => {
        this.stopListening();
    }, 6000);
}

// ✅ THÊM: Auto-stop khi có final result
if (finalTranscript) {
    onResult(finalTranscript, true);
    this.stopListening(); // Tự động dừng
}
```

**Lợi ích:**
- ✅ Tự động dừng sau 10s (giống Sophia `timeout=10`)
- ✅ Tự động dừng sau 6s kể từ khi bắt đầu nói (giống Sophia `phrase_time_limit=6`)
- ✅ Tự động dừng khi nhận được câu nói hoàn chỉnh
- ✅ Không lắng nghe vô thời hạn nữa

#### 2. **AssistantPageEnhanced.tsx** - Bỏ Wake Word Mode

**TRƯỚC:**
```typescript
const [wakeWordMode, setWakeWordMode] = useState(false);

// Wake word listener chạy continuous
const startWakeWordListener = () => {
    setWakeWordMode(true);
    audioService.startListening(
        (transcript) => {
            if (transcript.includes('legal') || ...) {
                // Phát hiện wake word
            }
        }
    );
};
```

**SAU:**
```typescript
// ❌ BỎ wakeWordMode
// ✅ THAY BẰNG: Click to Talk

const handleMicClick = () => {
    console.log('[Assistant] Mic clicked - starting to listen');
    setIsListening(true);
    
    audioService.startListening(
        (transcript, isFinal) => {
            setInputText(transcript);
            
            // Auto-send khi final (người nói xong)
            if (isFinal && transcript.trim().length > 0) {
                handleSendMessage(transcript);
            }
        },
        (err) => setIsListening(false),
        () => setIsListening(false)
    );
};
```

**Lợi ích:**
- ✅ Đơn giản hơn: Không cần theo dõi wake word
- ✅ Rõ ràng hơn: User biết khi nào đang nghe (click mic)
- ✅ Tiết kiệm tài nguyên: Không lắng nghe liên tục
- ✅ Giống Siri/Sophia: Click → Nói → Tự động dừng

#### 3. **UI Changes** - 2 Chế độ Rõ Ràng

**TRƯỚC:**
```typescript
// 3 trạng thái khó phân biệt
{wakeWordMode ? (
    <Radio className="animate-pulse" /> // Đang đợi wake word
) : isListening ? (
    <Mic className="animate-pulse" />  // Đang nghe lệnh
) : (
    <MicOff />                         // Idle
)}
```

**SAU:**
```typescript
// 2 trạng thái rõ ràng như Sophia
<button className={
    isListening 
        ? 'bg-red-500 scale-110 ring-4 animate-pulse'  // LISTENING
        : 'bg-blue-600 hover:scale-105'                 // IDLE (ready)
}>
    {isListening ? <MicOff /> : <Mic />}
</button>

<p className="text-xs">
    {isListening 
        ? "🎤 Đang nghe... (tự động dừng sau 10s)"
        : "💡 Click mic để nói"}
</p>
```

**Lợi ích:**
- ✅ Rõ ràng: IDLE (xanh) vs LISTENING (đỏ, to, pulse)
- ✅ Feedback tốt: User biết chính xác trạng thái
- ✅ Giống Sophia: Oval (idle) → SiriWave (listening)

### 📊 SO SÁNH FLOW

#### **Sophia (Đúng):**
```
1. [IDLE] Hiển thị Oval + "Ask me anything"
2. User CLICK mic
3. [LISTENING] Hiển thị SiriWave + "Listening..."
4. User nói
5. Tự động dừng sau 10s HOẶC 6s sau khi bắt đầu nói
6. Xử lý lệnh
7. Quay về [IDLE]
```

#### **Legal Assistant (Trước đây - SAI):**
```
1. [WAKE WORD MODE] Lắng nghe liên tục
2. User nói "Legal"
3. [COMMAND MODE] Chuyển sang lắng nghe lệnh
4. User nói lệnh
5. ❌ Không tự dừng → Nghe mãi
6. Xử lý lệnh
7. ❌ Quay về [WAKE WORD MODE] → Nghe mãi tiếp
```

#### **Legal Assistant (Bây giờ - ĐÚNG):**
```
1. [IDLE] Hiển thị mic xanh
2. User CLICK mic
3. [LISTENING] Mic đỏ, to, pulse
4. User nói
5. ✅ Tự động dừng sau 10s HOẶC 6s sau khi bắt đầu nói
6. Xử lý lệnh
7. Quay về [IDLE]
```

### 🎯 KẾT QUẢ

**Trước:**
- ❌ Lắng nghe liên tục 24/7
- ❌ Tiêu tốn tài nguyên
- ❌ Khó debug (nhiều state)
- ❌ Không rõ ràng khi nào đang nghe
- ❌ Không giống Siri

**Sau:**
- ✅ Chỉ nghe khi user click
- ✅ Tiết kiệm tài nguyên
- ✅ Đơn giản (2 state thay vì 3)
- ✅ Rõ ràng: Mic xanh = sẵn sàng, Mic đỏ = đang nghe
- ✅ Giống Siri/Sophia

### 🚀 CÁCH SỬ DỤNG

1. **Bắt đầu:**
   - Mở app → Click "Bắt đầu Tư vấn"
   - Assistant chào → "Nhấn mic để hỏi..."

2. **Hỏi bằng giọng nói:**
   - Click nút mic xanh
   - Mic chuyển đỏ, to ra, pulse
   - Nói câu hỏi của bạn
   - **TỰ ĐỘNG DỪNG** sau khi bạn nói xong (hoặc 10s)
   - Câu trả lời hiển thị + TTS/Video

3. **Hỏi lại:**
   - Click mic lần nữa → Lặp lại

### 📝 LƯU Ý

- **Timeout 10s:** Nếu không nói gì → Tự động dừng
- **Phrase timeout 6s:** Sau khi bắt đầu nói, 6s sẽ tự dừng
- **Auto-stop:** Khi nhận được câu nói hoàn chỉnh → Tự động dừng
- **No wake word:** Không cần nói "Hey Legal" nữa, chỉ cần click mic

### 🔧 NẾU MUỐN TRỞ LẠI WAKE WORD

Nếu user muốn wake word, có thể:
1. Thêm chế độ toggle: "Click to Talk" vs "Wake Word"
2. Nhưng wake word phải sửa lại:
   - `continuous = false`
   - Sau khi phát hiện wake word → Chuyển sang command mode
   - Command mode cũng phải có timeout
   - Sau khi xử lý xong → Quay về wake word mode

Nhưng **khuyến nghị**: Giữ Click-to-Talk vì:
- ✅ Đơn giản hơn
- ✅ Ổn định hơn
- ✅ Ít bug hơn
- ✅ Giống Siri/Google Assistant mobile (cần nhấn button)
