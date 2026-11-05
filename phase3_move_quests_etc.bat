@echo off
REM Phase 3 (no Git needed): quests, markers, slumber, calaun, select, lights
REM Run from the repo root (the folder that contains index.html and assets\)
REM NOTE: quests_full.webp is intentionally NOT moved (see chat).
for %%D in (quests markers slumber calaun select lights) do if not exist assets\%%D mkdir assets\%%D
move /Y assets\q_*.webp assets\quests\
move /Y assets\qp_*.webp assets\quests\
move /Y assets\quests_img.webp assets\quests\
move /Y assets\mk_art_*.webp assets\markers\
move /Y assets\slm_img_*.webp assets\slumber\
move /Y assets\cal_img*.webp assets\calaun\
move /Y assets\sel_art*.webp assets\select\
move /Y assets\sel_img_*.webp assets\select\
move /Y assets\strange_light_*.webp assets\lights\
move /Y assets\strange_lights_card.jpg assets\lights\
move /Y assets\sq_lights_card.webp assets\lights\
echo.
echo Expected: quests 11, markers 9, slumber 9, calaun 7, select 9, lights 7
echo Actual:
for %%D in (quests markers slumber calaun select lights) do (
  echo   %%D:
  dir /b assets\%%D | find /c /v ""
)
pause
