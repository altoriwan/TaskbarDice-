@echo off
echo ============================================================
echo  Block Void Standalone Executable Builder
echo ============================================================
cd /d "%~dp0"
"%~dp0venv\Scripts\pyinstaller.exe" --noconsole --onefile --name "BlockVoid" --add-data "static;static" --clean app.py
if exist "%~dp0dist\BlockVoid.exe" (
    copy /y "%~dp0dist\BlockVoid.exe" "%~dp0dist\TaskbarDice.exe" >nul
)
echo.
echo [DONE] Executables updated at:
echo        - %~dp0dist\BlockVoid.exe
echo        - %~dp0dist\TaskbarDice.exe
pause
