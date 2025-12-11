"""
PantoMatrix FastAPI Service
Receives audio, generates gesture video using PantoMatrix, returns video URL
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
import shutil
from pathlib import Path
import subprocess
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PantoMatrix Gesture Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
PANTOMATRIX_DIR = BASE_DIR / "PantoMatrix"

UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

@app.get("/healthz")
async def health_check():
    """Health check endpoint"""
    pantomatrix_exists = PANTOMATRIX_DIR.exists()
    return {
        "status": "healthy",
        "pantomatrix_installed": pantomatrix_exists,
        "message": "PantoMatrix service is running"
    }

@app.post("/api/generate")
async def generate_gesture_video(audio: UploadFile = File(...)):
    """
    Generate gesture video from audio
    
    Input: Audio file (wav/mp3)
    Output: Video file URL
    """
    try:
        # Validate file type
        if not audio.content_type or not audio.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be audio format")
        
        # Generate unique ID for this request
        request_id = str(uuid.uuid4())
        
        # Save uploaded audio
        audio_path = UPLOAD_DIR / f"{request_id}.wav"
        with open(audio_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
        
        logger.info(f"Audio saved: {audio_path}")
        
        # Output paths
        motion_path = OUTPUT_DIR / f"{request_id}_motion.npz"
        video_path = OUTPUT_DIR / f"{request_id}.mp4"
        
        # Check if PantoMatrix is installed
        if not PANTOMATRIX_DIR.exists():
            logger.warning("PantoMatrix not installed, returning mock video")
            return {
                "video_url": f"http://localhost:8081/api/video/{request_id}",
                "status": "mock",
                "message": "PantoMatrix not installed. Using placeholder."
            }
        
        # Run PantoMatrix inference
        logger.info("Running PantoMatrix inference...")
        try:
            # Activate virtual environment and run inference
            python_executable = PANTOMATRIX_DIR / "py39" / "bin" / "python"
            if not python_executable.exists():
                python_executable = "python"  # Fallback to system python
            
            # Run inference script
            result = subprocess.run(
                [
                    str(python_executable),
                    str(PANTOMATRIX_DIR / "test_camn_audio.py"),
                    "--audio_path", str(audio_path),
                    "--output_path", str(motion_path),
                    "--no_visualization"  # Skip visualization during inference
                ],
                cwd=str(PANTOMATRIX_DIR),
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode != 0:
                logger.error(f"PantoMatrix inference failed: {result.stderr}")
                raise HTTPException(status_code=500, detail="Gesture generation failed")
            
            logger.info("Motion parameters generated successfully")
            
            # Render video from motion parameters
            logger.info("Rendering video...")
            render_result = subprocess.run(
                [
                    str(python_executable),
                    "-c",
                    f"""
from emage_utils import fast_render
fast_render.render_one_sequence_no_gt(
    '{motion_path}',
    '{audio_path}',
                    '{video_path}',
    remove_global=True
)
"""
                ],
                cwd=str(PANTOMATRIX_DIR),
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if render_result.returncode != 0:
                logger.error(f"Video rendering failed: {render_result.stderr}")
                raise HTTPException(status_code=500, detail="Video rendering failed")
            
            logger.info(f"Video generated: {video_path}")
            
            # Clean up audio file
            audio_path.unlink(missing_ok=True)
            
            return {
                "video_url": f"http://localhost:8081/api/video/{request_id}",
                "status": "success",
                "request_id": request_id
            }
            
        except subprocess.TimeoutExpired:
            logger.error("PantoMatrix process timed out")
            raise HTTPException(status_code=504, detail="Processing timeout")
        except Exception as e:
            logger.error(f"Error during generation: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    except Exception as e:
        logger.error(f"Error in generate_gesture_video: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/video/{request_id}")
async def get_video(request_id: str):
    """Serve generated video file"""
    video_path = OUTPUT_DIR / f"{request_id}.mp4"
    
    if not video_path.exists():
        # Return placeholder/mock video URL
        return {
            "error": "Video not found",
            "mock_url": "https://storage.googleapis.com/beatbots/sample_gesture.mp4"
        }
    
    return FileResponse(
        video_path,
        media_type="video/mp4",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600"
        }
    )

@app.delete("/api/video/{request_id}")
async def delete_video(request_id: str):
    """Clean up generated files"""
    video_path = OUTPUT_DIR / f"{request_id}.mp4"
    motion_path = OUTPUT_DIR / f"{request_id}_motion.npz"
    
    deleted = []
    if video_path.exists():
        video_path.unlink()
        deleted.append("video")
    if motion_path.exists():
        motion_path.unlink()
        deleted.append("motion")
    
    return {"deleted": deleted, "request_id": request_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
