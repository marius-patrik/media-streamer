import os
import subprocess
import urllib.parse
from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MEDIA_DIR = "/mnt/HDD1/media"
DIST_DIR = "/home/patrik/media-streamer/dist"

# Mount compiled static assets (js/css/etc)
if os.path.exists(os.path.join(DIST_DIR, "static")):
    app.mount("/static", StaticFiles(directory=os.path.join(DIST_DIR, "static")), name="static")

@app.get("/api/media")
def list_media():
    if not os.path.exists(MEDIA_DIR):
        return {"error": "Media directory not found"}
    
    def scan_dir(path, relative_path=""):
        items = []
        try:
            for entry in os.scandir(path):
                if entry.name.startswith('.'):
                    continue
                rel = os.path.join(relative_path, entry.name)
                if entry.is_dir():
                    items.append({
                        "name": entry.name,
                        "type": "directory",
                        "path": rel,
                        "children": scan_dir(entry.path, rel)
                    })
                else:
                    ext = os.path.splitext(entry.name)[1].lower()
                    if ext in ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.srt', '.vtt']:
                        items.append({
                            "name": entry.name,
                            "type": "file",
                            "path": rel,
                            "size": entry.stat().st_size
                        })
        except Exception as e:
            pass
        items.sort(key=lambda x: (x["type"] != "directory", x["name"].lower()))
        return items

    return scan_dir(MEDIA_DIR)

@app.get("/stream/{filepath:path}")
def stream_file(filepath: str, transcode: bool = Query(True)):
    safe_path = os.path.abspath(os.path.join(MEDIA_DIR, filepath))
    if not safe_path.startswith(os.path.abspath(MEDIA_DIR)):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not os.path.exists(safe_path) or not os.path.isfile(safe_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    if transcode:
        # Transcode audio to browser-supported AAC, copy video track untouched
        cmd = [
            "ffmpeg",
            "-i", safe_path,
            "-vcodec", "copy",
            "-acodec", "aac",
            "-ab", "192k",
            "-ac", "2",  # force 2-channel stereo for absolute browser compatibility
            "-sn",
            "-f", "mp4",
            "-movflags", "frag_keyframe+empty_moov",
            "pipe:1"
        ]
        
        def iterfile():
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                bufsize=10**6
            )
            try:
                while True:
                    data = process.stdout.read(4096 * 32)
                    if not data:
                        break
                    yield data
            finally:
                process.terminate()
                process.wait()
                
        return StreamingResponse(iterfile(), media_type="video/mp4")
    
    return FileResponse(safe_path)

@app.get("/favicon.png")
def get_favicon():
    favicon_path = os.path.join(DIST_DIR, "favicon.png")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path)
    raise HTTPException(status_code=404, detail="Not found")

@app.get("/{rest:path}")
def get_index(rest: str = ""):
    # Serve index.html for all other routes to support single page app routing if needed
    index_path = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>TailStreamer compiled dist/index.html not found on server!</h1>")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
