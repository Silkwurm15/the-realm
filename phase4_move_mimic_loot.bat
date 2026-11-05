@echo off
REM Phase 4 (no Git needed): mimic and loot art
REM Run from the repo root (the folder that contains index.html and assets\)
if not exist assets\mimic mkdir assets\mimic
if not exist assets\loot mkdir assets\loot
move /Y assets\mimic_*.webp assets\mimic\
move /Y assets\strong_*.webp assets\mimic\
move /Y assets\living_mimic.webp assets\mimic\
move /Y assets\tc_*.webp assets\loot\
echo.
echo Expected: mimic 6, loot 8
echo Actual:
for %%D in (mimic loot) do (
  echo   %%D:
  dir /b assets\%%D | find /c /v ""
)
pause
