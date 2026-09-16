@echo off
title My Room Preview Server
cd /d "%~dp0"

echo Starting My Room...
echo Keep this window open while using the room.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:4173/'"
npm run dev -- --host 0.0.0.0

echo.
echo The preview server has stopped.
pause
