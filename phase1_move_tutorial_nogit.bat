@echo off
REM Phase 1 (no Git needed): move tutorial images (mc_*) into assets\tutorial
REM Run from the repo root (the folder that contains index.html and assets\)
if not exist assets\tutorial mkdir assets\tutorial
move /Y assets\mc_*.webp assets\tutorial\
echo.
echo Files now in assets\tutorial:
dir /b assets\tutorial | find /c /v ""
pause
