@echo off
REM Phase 2 (no Git needed): classes, npcs, looks
REM Run from the repo root (the folder that contains index.html and assets\)
if not exist assets\classes mkdir assets\classes
if not exist assets\npcs mkdir assets\npcs
if not exist assets\looks mkdir assets\looks
move /Y assets\cls_emb_*.webp assets\classes\
move /Y assets\ar_npc_img_*.webp assets\npcs\
move /Y assets\ar_champ_img_*.webp assets\npcs\
move /Y assets\healer.webp assets\npcs\
move /Y assets\wizard.webp assets\npcs\
move /Y assets\look_img_*.webp assets\looks\
move /Y assets\panda_img.webp assets\looks\
echo.
echo Expected: classes 12, npcs 14, looks 10
echo Actual:
for %%D in (classes npcs looks) do (
  echo   %%D:
  dir /b assets\%%D | find /c /v ""
)
pause
