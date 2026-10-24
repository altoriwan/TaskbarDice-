@echo off
setlocal
cd /d "%~dp0"

:: 1. Activate Python virtual environment if available
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    goto :run_app
)
if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
    goto :run_app
)

echo [SETUP] Virtual environment not found. Creating venv...
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt

:run_app
echo [LAUNCH] Starting TaskbarDice Desktop Widget...
python app.py
