@echo off
REM Run Windows Rescue from source, asking for administrator rights.
cd /d "%~dp0"
python -m windows_rescue --elevate %*
