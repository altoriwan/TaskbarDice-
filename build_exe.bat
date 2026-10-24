@echo off
echo ============================================================
echo  TaskbarDice Standalone Executable Builder
echo ============================================================
cd /d "%~dp0"
"%~dp0venv\Scripts\pyinstaller.exe" --noconsole --onefile --name "TaskbarDice" --add-data "static;static" --clean app.py
echo.
echo [DONE] Executable created at: %~dp0dist\TaskbarDice.exe
pause
