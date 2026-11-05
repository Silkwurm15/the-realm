@echo off
setlocal enabledelayedexpansion
REM Phase 7: read-only check. Moves nothing. Run from the repo root (folder with index.html and assets\)
set total=0
echo Checking assets folders...
echo.
call :chk tutorial 45
call :chk classes 12
call :chk npcs 14
call :chk looks 10
call :chk quests 11
call :chk markers 9
call :chk slumber 14
call :chk calaun 10
call :chk select 13
call :chk lights 7
call :chk mimic 6
call :chk loot 8
call :chk library 11
call :chk rift 6
call :chk door 9
call :chk nature 2
call :chk skins 155
call :chk icons 10
call :chk items 4
call :chk nav 6
call :chk menu 4
call :chk hero 4
call :chk splash 2
call :chk auth 3
call :chk hud 6
call :chk chaos 4
call :chk arena 1
echo.
echo Total files in folders: !total!  (expected 386)
echo.
echo Files still loose in assets (should be just art.txt):
dir /b /a-d assets
echo.
pause
goto :eof

:chk
set n=0
for /f %%A in ('dir /b assets\%~1 2^>nul ^| find /c /v ""') do set n=%%A
if "!n!"=="%~2" (echo   OK     %~1 !n!) else (echo   CHECK  %~1 has !n!, expected %~2)
set /a total+=n
goto :eof
