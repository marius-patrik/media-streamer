# TailStreamer 🎬

A premium, state-of-the-art personal Media Center and Streamer designed to run natively over secure Tailscale networks.

## Features

- **📂 Glassmorphism Dashboard**: A highly polished responsive web UI built with violet/neon glassmorphic accents, dynamic transitions, and modern Outfits typography.
- **⚡ Native HTTP Range Streaming**: Stream local video files directly in the browser with full scrubbing/seeking support via FastAPIs native range-requests logic.
- **🔊 On-the-Fly Audio Transcoding**: Automatically transcodes surround audio tracks (like **AC3** or **DTS**) on-the-fly to browser-friendly **AAC** utilizing `ffmpeg` pipeline, maintaining direct video stream copy (0% video compression overhead).
- **☁️ Cloud Cinema Mode**: Aggregates cloud streaming providers (like `embed.su` and `vidsrc.to`) directly in-app, integrated with TMDb API to search and stream any global movie or TV show.
- **🛡️ Tailscale Native**: Access your library securely from anywhere, on any device (including your TV, phone, or tablet) directly over your Tailnet.

## Technology Stack

- **Backend**: FastAPI (Python), Uvicorn, FFmpeg (transcoding pipeline)
- **Frontend**: HTML5, Vanilla CSS, Vanilla JS, Remix Icons

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/marius-patrik/media-streamer.git
   cd media-streamer
   ```
2. Run using `uv` (isolated python package manager):
   ```bash
   uv run --with fastapi --with uvicorn python server.py
   ```
3. Open your browser and navigate to `http://localhost:8080/` (or your machine's Tailscale IP).
