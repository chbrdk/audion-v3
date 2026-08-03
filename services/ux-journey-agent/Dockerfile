# UX Journey Agent — Dockerfile
#
# Build context = this folder (`apps/ux-journey-agent/`). The vendored
# `audion-agent` fork lives under `./audion-agent/` and is installed
# from there in step 1 below — no monorepo-aware build context required.
#
# Locally:
#
#   cd services/ux-journey-agent
#   docker build -t audion-v3-ux-journey-agent .
#
# Coolify: Base Directory = `services/ux-journey-agent`, Dockerfile = `Dockerfile`.
#
# Python 3.12 — required by audion-agent (>=3.11) and by playwright/asyncio.
FROM python:3.12-slim-bookworm

WORKDIR /app

# System deps: Playwright/Chromium need these libs; ffmpeg transcodes the
# Playwright WebM recording into a smooth, seekable MP4 (constant framerate,
# H.264 yuv420p, +faststart) that browsers can play without judder.
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    ffmpeg \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
    fonts-liberation libasound2-plugins \
    && rm -rf /var/lib/apt/lists/*

# Step 1: install the vendored audion-agent fork (soft fork of browser-use 0.12.6).
# Copying the package into a separate prefix keeps the install layer small and
# stable across rebuilds — only changes to ./audion-agent invalidate it.
COPY audion-agent /opt/audion-agent
RUN pip install --no-cache-dir --timeout 120 "/opt/audion-agent[video]"

# Step 2: install the app-specific deps (FastAPI, uvicorn, playwright pin).
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 120 -r requirements.txt

# Step 3: install Playwright Chromium binary into a stable location.
ENV PLAYWRIGHT_BROWSERS_PATH=/msqdx-playwright
RUN python -m playwright install chromium && python -m playwright install-deps chromium || true

# Step 4: copy the app source last so iteration on main.py doesn't re-trigger
# the heavy package installs above.
COPY main.py .
COPY security.py .
COPY browser_ua.py .
COPY perception.py .
COPY persona_lab_l4.py .
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

ENV PORT=8320
ENV UX_JOURNEY_OPENAI_MODEL=gpt-5.6-luna
EXPOSE 8320

ENTRYPOINT ["./entrypoint.sh"]
CMD ["python", "main.py"]
