"""Orpheus API server entry point."""

from fastapi import FastAPI

app = FastAPI(
    title="Orpheus",
    description="Intelligent lesson documentation system for music educators",
    version="0.1.0",
)
