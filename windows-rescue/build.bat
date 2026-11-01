@echo off
REM Builds dist\WindowsRescue.exe - a single portable file that asks for
REM administrator rights (UAC) when it starts.
setlocal
cd /d "%~dp0"

where python >nul 2>nul || (echo Python 3.8+ is required: https://www.python.org/downloads/ & exit /b 1)

python -m pip install --upgrade pyinstaller || exit /b 1
python -m PyInstaller --noconfirm --clean --onefile --windowed --uac-admin ^
    --name WindowsRescue ^
    --collect-submodules windows_rescue ^
    run_rescue.py || exit /b 1

echo.
echo Built: %CD%\dist\WindowsRescue.exe
