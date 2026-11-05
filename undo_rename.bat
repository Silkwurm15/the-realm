@echo off
setlocal
REM UNDO: put every renamed art file back to its old name.
REM Run from the repo root (the folder that contains index.html and assets\)
REM After this, also restore the code files:
REM   git checkout -- index.html realm_anim.js strange_lights.html   (if not committed yet)
REM   or git revert the commit (if already committed).
if not exist index.html (
  echo Run this from the repo root, the folder that contains index.html.
  pause
  exit /b 1
)
set USEGIT=
git --version >nul 2>nul && set USEGIT=1
if defined USEGIT (
  echo Using git mv.
) else (
  echo git was not found on PATH, so plain move is used. GitHub Desktop still shows these as renames.
)
set DONE=0
set MISS=0

call :mv "assets\auth\auth_google.jpg" "assets\auth\ag_background_image.jpg"
call :mv "assets\auth\auth_signin.jpg" "assets\auth\ain_background_image.jpg"
call :mv "assets\auth\auth_signup.jpg" "assets\auth\aup_background_image.jpg"
call :mv "assets\calaun\cal_img_01.webp" "assets\calaun\cal_img.webp"
call :mv "assets\calaun\cal_img_02.webp" "assets\calaun\cal_img_2.webp"
call :mv "assets\calaun\cal_img_03.webp" "assets\calaun\cal_img_3.webp"
call :mv "assets\calaun\cal_img_04.webp" "assets\calaun\cal_img_4.webp"
call :mv "assets\calaun\cal_img_05.webp" "assets\calaun\cal_img_5.webp"
call :mv "assets\calaun\cal_img_06.webp" "assets\calaun\cal_img_6.webp"
call :mv "assets\calaun\cal_img_07.webp" "assets\calaun\cal_img_7.webp"
call :mv "assets\calaun\cal_img_08.webp" "assets\calaun\img.webp"
call :mv "assets\calaun\cal_img_09.webp" "assets\calaun\img_2.webp"
call :mv "assets\calaun\cal_icon.webp" "assets\calaun\img_3.webp"
call :mv "assets\chaos\chaos_button.webp" "assets\chaos\chaosbutton_background_image.webp"
call :mv "assets\chaos\chaos_card_fr.webp" "assets\chaos\chaoscard_fr.webp"
call :mv "assets\chaos\chaos_die.webp" "assets\chaos\chaosdie_background.webp"
call :mv "assets\chaos\chaos_row.webp" "assets\chaos\chrow_background.webp"
call :mv "assets\door\wd_door.webp" "assets\door\whispering_door.webp"
call :mv "assets\hud\hud_compass.webp" "assets\hud\compass_background.webp"
call :mv "assets\hud\hud_layer_btn.webp" "assets\hud\layerbutton_background_image.webp"
call :mv "assets\hud\hud_rotate_btn.webp" "assets\hud\rotatebutton_background_image.webp"
call :mv "assets\hud\hud_topbar.webp" "assets\hud\topbar_background.webp"
call :mv "assets\hud\hud_zoom_in.webp" "assets\hud\zoomin_background_image.webp"
call :mv "assets\hud\hud_zoom_out.webp" "assets\hud\zoomout_background_image.webp"
call :mv "assets\items\item_class_change.webp" "assets\items\cc_src.webp"
call :mv "assets\items\item_cloak.webp" "assets\items\cloak_svg.webp"
call :mv "assets\items\item_arena_coin.webp" "assets\items\coin_src.webp"
call :mv "assets\items\item_key.webp" "assets\items\key_src.webp"
call :mv "assets\library\lib_01.webp" "assets\library\lib_1.webp"
call :mv "assets\library\lib_02.webp" "assets\library\lib_2.webp"
call :mv "assets\library\lib_03.webp" "assets\library\lib_3.webp"
call :mv "assets\library\lib_04.webp" "assets\library\lib_4.webp"
call :mv "assets\library\lib_05.webp" "assets\library\lib_5.webp"
call :mv "assets\library\lib_knowledge.webp" "assets\library\library_knowledge.webp"
call :mv "assets\lights\lights_card_quest.webp" "assets\lights\sq_lights_card.webp"
call :mv "assets\lights\strange_light_01.webp" "assets\lights\strange_light_1.webp"
call :mv "assets\lights\strange_light_02.webp" "assets\lights\strange_light_2.webp"
call :mv "assets\lights\strange_light_03.webp" "assets\lights\strange_light_3.webp"
call :mv "assets\lights\strange_light_04.webp" "assets\lights\strange_light_4.webp"
call :mv "assets\lights\strange_light_05.webp" "assets\lights\strange_light_5.webp"
call :mv "assets\lights\lights_card_page.jpg" "assets\lights\strange_lights_card.jpg"
call :mv "assets\menu\menu_emb_01.webp" "assets\menu\menuemb.webp"
call :mv "assets\menu\menu_emb_02.webp" "assets\menu\menuemb_2.webp"
call :mv "assets\menu\menu_emb_03.webp" "assets\menu\menuemb_3.webp"
call :mv "assets\menu\menu_emb_04.webp" "assets\menu\menuemb_4.webp"
call :mv "assets\mimic\mimic_living.webp" "assets\mimic\living_mimic.webp"
call :mv "assets\mimic\mimic_strong_battle.webp" "assets\mimic\strong_battle.webp"
call :mv "assets\mimic\mimic_strong_img.webp" "assets\mimic\strong_mimic_img.webp"
call :mv "assets\nav\nav_map.png" "assets\nav\ni.png"
call :mv "assets\nav\nav_quests.png" "assets\nav\ni_2.png"
call :mv "assets\nav\nav_arena.png" "assets\nav\ni_3.png"
call :mv "assets\nav\nav_shop.png" "assets\nav\ni_4.png"
call :mv "assets\nav\nav_character.png" "assets\nav\ni_5.png"
call :mv "assets\nav\nav_menu.png" "assets\nav\ni_6.png"
call :mv "assets\npcs\ar_npc_img_healer.webp" "assets\npcs\healer.webp"
call :mv "assets\npcs\ar_npc_img_wizard.webp" "assets\npcs\wizard.webp"
call :mv "assets\rift\rift_bg.webp" "assets\rift\rft_background.webp"
call :mv "assets\rift\rift_wild_room.webp" "assets\rift\wild_room.webp"
call :mv "assets\rift\rift_wild_swirl.webp" "assets\rift\wild_swirl.webp"
call :mv "assets\select\sel_art_05.webp" "assets\select\img_4.webp"
call :mv "assets\select\sel_art_06.webp" "assets\select\img_5.webp"
call :mv "assets\select\sel_art_07.webp" "assets\select\img_6.webp"
call :mv "assets\select\sel_art_08.webp" "assets\select\img_7.webp"
call :mv "assets\select\sel_art_01.webp" "assets\select\sel_art.webp"
call :mv "assets\select\sel_art_02.webp" "assets\select\sel_art_2.webp"
call :mv "assets\select\sel_art_03.webp" "assets\select\sel_art_3.webp"
call :mv "assets\select\sel_art_04.webp" "assets\select\sel_art_4.webp"
call :mv "assets\skins\css_b1l_01.webp" "assets\skins\css_b1l.webp"
call :mv "assets\skins\css_b1l_02.webp" "assets\skins\css_b1l_2.webp"
call :mv "assets\skins\css_b1l_03.webp" "assets\skins\css_b1l_3.webp"
call :mv "assets\skins\css_b1l_04.webp" "assets\skins\css_b1l_4.webp"
call :mv "assets\skins\css_b1l_05.webp" "assets\skins\css_b1l_5.webp"
call :mv "assets\skins\css_b1l_06.webp" "assets\skins\css_b1l_6.webp"
call :mv "assets\skins\css_b1l_07.webp" "assets\skins\css_b1l_7.webp"
call :mv "assets\skins\css_b1l_08.webp" "assets\skins\css_b1l_8.webp"
call :mv "assets\skins\css_b1l_09.webp" "assets\skins\css_b1l_9.webp"
call :mv "assets\skins\css_b1m_01.webp" "assets\skins\css_b1m.webp"
call :mv "assets\skins\css_b1m_02.webp" "assets\skins\css_b1m_2.webp"
call :mv "assets\skins\css_b1m_03.webp" "assets\skins\css_b1m_3.webp"
call :mv "assets\skins\css_b1m_04.webp" "assets\skins\css_b1m_4.webp"
call :mv "assets\skins\css_b1m_05.webp" "assets\skins\css_b1m_5.webp"
call :mv "assets\skins\css_b1m_06.webp" "assets\skins\css_b1m_6.webp"
call :mv "assets\skins\css_b1m_07.webp" "assets\skins\css_b1m_7.webp"
call :mv "assets\skins\css_b1m_08.webp" "assets\skins\css_b1m_8.webp"
call :mv "assets\skins\css_b1m_09.webp" "assets\skins\css_b1m_9.webp"
call :mv "assets\skins\css_b1r_01.webp" "assets\skins\css_b1r.webp"
call :mv "assets\skins\css_b1r_02.webp" "assets\skins\css_b1r_2.webp"
call :mv "assets\skins\css_b1r_03.webp" "assets\skins\css_b1r_3.webp"
call :mv "assets\skins\css_b1r_04.webp" "assets\skins\css_b1r_4.webp"
call :mv "assets\skins\css_b1r_05.webp" "assets\skins\css_b1r_5.webp"
call :mv "assets\skins\css_b1r_06.webp" "assets\skins\css_b1r_6.webp"
call :mv "assets\skins\css_b1r_07.webp" "assets\skins\css_b1r_7.webp"
call :mv "assets\skins\css_b1r_08.webp" "assets\skins\css_b1r_8.webp"
call :mv "assets\skins\css_b1r_09.webp" "assets\skins\css_b1r_9.webp"
call :mv "assets\skins\css_b2l_01.webp" "assets\skins\css_b2l.webp"
call :mv "assets\skins\css_b2l_02.webp" "assets\skins\css_b2l_2.webp"
call :mv "assets\skins\css_b2l_03.webp" "assets\skins\css_b2l_3.webp"
call :mv "assets\skins\css_b2l_04.webp" "assets\skins\css_b2l_4.webp"
call :mv "assets\skins\css_b2l_05.webp" "assets\skins\css_b2l_5.webp"
call :mv "assets\skins\css_b2m_01.webp" "assets\skins\css_b2m.webp"
call :mv "assets\skins\css_b2m_02.webp" "assets\skins\css_b2m_2.webp"
call :mv "assets\skins\css_b2m_03.webp" "assets\skins\css_b2m_3.webp"
call :mv "assets\skins\css_b2m_04.webp" "assets\skins\css_b2m_4.webp"
call :mv "assets\skins\css_b2m_05.webp" "assets\skins\css_b2m_5.webp"
call :mv "assets\skins\css_b2r_01.webp" "assets\skins\css_b2r.webp"
call :mv "assets\skins\css_b2r_02.webp" "assets\skins\css_b2r_2.webp"
call :mv "assets\skins\css_b2r_03.webp" "assets\skins\css_b2r_3.webp"
call :mv "assets\skins\css_b2r_04.webp" "assets\skins\css_b2r_4.webp"
call :mv "assets\skins\css_b2r_05.webp" "assets\skins\css_b2r_5.webp"
call :mv "assets\skins\css_bot_01.webp" "assets\skins\css_bot.webp"
call :mv "assets\skins\css_bot_02.webp" "assets\skins\css_bot_2.webp"
call :mv "assets\skins\css_bot_03.webp" "assets\skins\css_bot_3.webp"
call :mv "assets\skins\css_bot_04.webp" "assets\skins\css_bot_4.webp"
call :mv "assets\skins\css_bot_05.webp" "assets\skins\css_bot_5.webp"
call :mv "assets\skins\css_bot_06.webp" "assets\skins\css_bot_6.webp"
call :mv "assets\skins\css_bot_07.webp" "assets\skins\css_bot_7.webp"
call :mv "assets\skins\css_bot_08.webp" "assets\skins\css_bot_8.webp"
call :mv "assets\skins\css_bot_09.webp" "assets\skins\css_bot_9.webp"
call :mv "assets\skins\css_div_01.webp" "assets\skins\css_div.webp"
call :mv "assets\skins\css_div_02.webp" "assets\skins\css_div_2.webp"
call :mv "assets\skins\css_div_03.webp" "assets\skins\css_div_3.webp"
call :mv "assets\skins\css_div_04.webp" "assets\skins\css_div_4.webp"
call :mv "assets\skins\css_div_05.webp" "assets\skins\css_div_5.webp"
call :mv "assets\skins\css_div_06.webp" "assets\skins\css_div_6.webp"
call :mv "assets\skins\css_div_07.webp" "assets\skins\css_div_7.webp"
call :mv "assets\skins\css_div_08.webp" "assets\skins\css_div_8.webp"
call :mv "assets\skins\css_div_09.webp" "assets\skins\css_div_9.webp"
call :mv "assets\skins\css_ls_01.webp" "assets\skins\css_ls.webp"
call :mv "assets\skins\css_ls_02.webp" "assets\skins\css_ls_2.webp"
call :mv "assets\skins\css_ls_03.webp" "assets\skins\css_ls_3.webp"
call :mv "assets\skins\css_ls_04.webp" "assets\skins\css_ls_4.webp"
call :mv "assets\skins\css_ls_05.webp" "assets\skins\css_ls_5.webp"
call :mv "assets\skins\css_ls_06.webp" "assets\skins\css_ls_6.webp"
call :mv "assets\skins\css_ls_07.webp" "assets\skins\css_ls_7.webp"
call :mv "assets\skins\css_ls_08.webp" "assets\skins\css_ls_8.webp"
call :mv "assets\skins\css_ls_09.webp" "assets\skins\css_ls_9.webp"
call :mv "assets\skins\css_rs_01.webp" "assets\skins\css_rs.webp"
call :mv "assets\skins\css_rs_02.webp" "assets\skins\css_rs_2.webp"
call :mv "assets\skins\css_rs_03.webp" "assets\skins\css_rs_3.webp"
call :mv "assets\skins\css_rs_04.webp" "assets\skins\css_rs_4.webp"
call :mv "assets\skins\css_rs_05.webp" "assets\skins\css_rs_5.webp"
call :mv "assets\skins\css_rs_06.webp" "assets\skins\css_rs_6.webp"
call :mv "assets\skins\css_rs_07.webp" "assets\skins\css_rs_7.webp"
call :mv "assets\skins\css_rs_08.webp" "assets\skins\css_rs_8.webp"
call :mv "assets\skins\css_rs_09.webp" "assets\skins\css_rs_9.webp"
call :mv "assets\skins\css_tex_01.webp" "assets\skins\css_tex.webp"
call :mv "assets\skins\css_tex_02.webp" "assets\skins\css_tex_2.webp"
call :mv "assets\skins\css_tex_03.webp" "assets\skins\css_tex_3.webp"
call :mv "assets\skins\css_tex_04.webp" "assets\skins\css_tex_4.webp"
call :mv "assets\skins\css_tex_05.webp" "assets\skins\css_tex_5.webp"
call :mv "assets\skins\css_tex_06.webp" "assets\skins\css_tex_6.webp"
call :mv "assets\skins\css_tex_07.webp" "assets\skins\css_tex_7.webp"
call :mv "assets\skins\css_tex_08.webp" "assets\skins\css_tex_8.webp"
call :mv "assets\skins\css_tex_09.webp" "assets\skins\css_tex_9.webp"
call :mv "assets\skins\css_top_01.webp" "assets\skins\css_top.webp"
call :mv "assets\skins\css_top_02.webp" "assets\skins\css_top_2.webp"
call :mv "assets\skins\css_top_03.webp" "assets\skins\css_top_3.webp"
call :mv "assets\skins\css_top_04.webp" "assets\skins\css_top_4.webp"
call :mv "assets\skins\css_top_05.webp" "assets\skins\css_top_5.webp"
call :mv "assets\skins\css_top_06.webp" "assets\skins\css_top_6.webp"
call :mv "assets\skins\ghost_top_01.webp" "assets\skins\ghost_top.webp"
call :mv "assets\skins\ghost_top_02.webp" "assets\skins\ghost_top_2.webp"
call :mv "assets\skins\ghost_top_03.webp" "assets\skins\ghost_top_3.webp"
call :mv "assets\skins\ghost_top_04.webp" "assets\skins\ghost_top_4.webp"
call :mv "assets\skins\ghost_top_05.webp" "assets\skins\ghost_top_5.webp"
call :mv "assets\skins\ghost_top_06.webp" "assets\skins\ghost_top_6.webp"
call :mv "assets\skins\ghost_top_07.webp" "assets\skins\ghost_top_7.webp"
call :mv "assets\skins\ghost_top_08.webp" "assets\skins\ghost_top_8.webp"
call :mv "assets\skins\ghost_top_09.webp" "assets\skins\ghost_top_9.webp"
call :mv "assets\slumber\slm_img_cabin.webp" "assets\slumber\cabin.webp"
call :mv "assets\slumber\slm_img_cave.webp" "assets\slumber\cave.webp"
call :mv "assets\slumber\slm_img_cliff.webp" "assets\slumber\cliff.webp"
call :mv "assets\slumber\slm_img_reveal.webp" "assets\slumber\reveal.webp"
call :mv "assets\slumber\slm_img_watchtower.webp" "assets\slumber\watchtower.webp"
call :mv "assets\splash\splash_hero.jpg" "assets\splash\himg.jpg"
call :mv "assets\splash\splash_loading.jpg" "assets\splash\oracle_loading.jpg"
call :mv "assets\quests\q_bg.webp" "quest_bg.webp"
call :mv "assets\quests\q_cards.webp" "quest_cards.webp"
call :mv "assets\quests\q_full.webp" "quests_full.webp"

echo.
echo Finished. Moved: %DONE%   Problems: %MISS%
if not "%MISS%"=="0" echo Scroll up for lines starting MISSING, EXISTS or FAILED.
echo Next: restore the 3 code files (see the REM lines at the top of this script).
pause
exit /b 0

:mv
if not exist "%~1" (
  echo MISSING: %~1
  set /a MISS+=1
  goto :eof
)
if exist "%~2" (
  echo EXISTS: %~2
  set /a MISS+=1
  goto :eof
)
if defined USEGIT (
  git mv "%~1" "%~2"
) else (
  move "%~1" "%~2" >nul
)
if errorlevel 1 (
  echo FAILED: %~1
  set /a MISS+=1
) else (
  set /a DONE+=1
)
goto :eof
