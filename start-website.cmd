@echo off
title UMBRA - local server
cd /d "%~dp0"

REM If a server is already running on 4321, just open the browser.
curl -s -o nul http://127.0.0.1:4321/ 2>nul
if %errorlevel%==0 (
  echo Server already running - opening browser.
  start "" http://127.0.0.1:4321/
  timeout /t 2 /nobreak >nul
  exit /b 0
)

echo Starting UMBRA server on http://127.0.0.1:4321/ ...
start "" http://127.0.0.1:4321/
node server.js 4321
