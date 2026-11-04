@echo off
REM Phase 1: move tutorial images (mc_*) into assets\tutorial
REM Run from the repo root (the folder that contains index.html and assets\)
if not exist assets\tutorial mkdir assets\tutorial
for %%F in (assets\mc_*.webp) do git mv "%%F" "assets\tutorial\%%~nxF"
echo Done. Files now in assets\tutorial:
dir /b assets\tutorial | find /c /v ""
