# PantoMatrix Service

Python microservice that generates gesture videos from audio using PantoMatrix.

## Architecture

```
Text (Frontend) 
  → TTS (Browser Speech API) 
  → Audio Blob 
  → POST /api/generate 
  → PantoMatrix Inference 
  → Motion Parameters (.npz) 
  → Video Rendering 
  → MP4 Video URL
```

## Quick Start

### Option 1: Local Python

```bash
# Install dependencies
pip install -r requirements.txt

# Run setup script to clone PantoMatrix
bash setup.sh  # Linux/Mac
# or
.\setup.ps1    # Windows PowerShell

# Start service
python app.py
```

Service runs on http://localhost:8081

### Option 2: Docker

```bash
# Build image
docker build -t pantomatrix-service .

# Run container
docker run -p 8081:8081 pantomatrix-service
```

### Option 3: Docker Compose (Recommended)

Already integrated in main `Legal-Supporter/docker-compose.yml`:

```bash
cd Legal-Supporter
docker-compose up -d pantomatrix
```

## API Endpoints

### Health Check
```
GET /healthz
```

Response:
```json
{
  "status": "healthy",
  "pantomatrix_installed": true,
  "message": "PantoMatrix service is running"
}
```

### Generate Gesture Video
```
POST /api/generate
Content-Type: multipart/form-data

Body:
  audio: <audio file> (wav/mp3)
```

Response:
```json
{
  "video_url": "http://localhost:8081/api/video/{request_id}",
  "status": "success",
  "request_id": "uuid-here"
}
```

### Get Video
```
GET /api/video/{request_id}
```

Returns MP4 video file.

### Delete Video
```
DELETE /api/video/{request_id}
```

Cleans up generated files.

## Environment Variables

- `PORT`: Service port (default: 8081)
- `UPLOAD_DIR`: Audio upload directory (default: ./uploads)
- `OUTPUT_DIR`: Video output directory (default: ./outputs)

## Integration with Legal-Frontend

The frontend service `pantoMatrixService.ts` handles:
1. Text → Audio conversion using Web Speech API (TTS)
2. Upload audio to this service
3. Poll/receive video URL
4. Display video in AvatarView component

Flow in `AssistantPageEnhanced.tsx`:
```typescript
// When assistant responds
const videoUrl = await pantoMatrixService.generateGestureVideo(response.text);
setAvatarVideoUrl(videoUrl);
```

## PantoMatrix Setup

The service expects PantoMatrix to be cloned and set up in `./PantoMatrix/` directory.

If PantoMatrix is not installed, the service runs in **mock mode** and returns placeholder videos.

To set up PantoMatrix:

```bash
# Clone repository
git clone https://github.com/PantoMatrix/PantoMatrix.git

# Run setup (requires Linux/WSL/Docker)
cd PantoMatrix
bash setup.sh
```

## Notes

- **Performance**: Video generation takes 30-120 seconds depending on audio length
- **Storage**: Videos are stored in `outputs/` directory
- **Cleanup**: Implement periodic cleanup of old videos to save disk space
- **Scalability**: For production, consider using queue system (Celery/RabbitMQ)
- **GPU**: PantoMatrix runs faster with GPU support (CUDA)

## Troubleshooting

### PantoMatrix not found
```json
{
  "status": "mock",
  "message": "PantoMatrix not installed. Using placeholder."
}
```
**Solution**: Run `setup.sh` to clone and setup PantoMatrix.

### Audio conversion fails
The frontend uses Web Speech API for TTS. Some browsers may not support audio recording from synthesized speech.

**Workaround**: Service accepts any audio file - you can use pre-recorded audio for testing.

### Video rendering timeout
```json
{
  "detail": "Processing timeout"
}
```
**Solution**: Increase timeout in `app.py` or use shorter audio clips.

## API Documentation

Interactive API docs available at: http://localhost:8081/docs

## License

Service code: MIT
PantoMatrix: See https://github.com/PantoMatrix/PantoMatrix
