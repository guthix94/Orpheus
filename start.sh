#!/bin/bash
echo "Starting Orpheus on port $PORT"
uvicorn server.main:app --host 0.0.0.0 --port $PORT
