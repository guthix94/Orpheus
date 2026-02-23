FROM python:3.13-slim

# System dependencies — ffmpeg required by VAD stage (webm→wav conversion)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD alembic upgrade head && uvicorn server.main:app --host 0.0.0.0 --port $PORT
