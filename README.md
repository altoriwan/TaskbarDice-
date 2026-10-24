# TaskbarDice 🎲

> **2.5D Retro Desktop Widget** built with `pywebview`, HTML5 Canvas 2D, and NES.css. Anchors directly above your Windows Taskbar to keep your priorities in focus.

---

## ✨ Features

- **Zero-Overflow Retro Layout**: Compact 400x420px frameless window with a 2-row NES control panel.
  - Row 1: Task text input + NES green `ADD` button.
  - Row 2: Weight selection (`W: 1-5`) and Time presets (`T: 15m, 25m, 1h, 4h, ..m`).
- **10 Escalating Lovecraftian Abyss Backgrounds**: The widget environment dynamically darkens and decays as active tasks pile up (from *Empty Void* to *Pandemonium Overload*).
- **5-Stage Real-Time Rot Engine**:
  - `Stage 1`: Pristine ivory with shine.
  - `Stage 2`: Fading sandy stone.
  - `Stage 3`: Weathered rock with dark fissures.
  - `Stage 4`: Mossy decay with creeping roots.
  - `Stage 5`: Necrotic purple/green slime with twitch jitter & floor puddles.
- **Retro Hover Inspection Tooltip**: Hover over any resting die to view its full title, weight indicators, rot stage, and real-time countdown timer.
- **Anti-Slacking Integrity Modal**: Double-click any resting die to confirm task completion.
- **Zen Garden Victory Transition**: Clearing all dice transforms the abyss into a serene Japanese rock garden with sand ripples, stone lanterns, and falling cherry blossoms.

---

## 🚀 Quick Start

### 1. Requirements
- Windows 10 / 11
- Python 3.10+
- Microsoft Edge WebView2 Runtime (pre-installed on Windows 10/11)

### 2. Run Directly (1-Click on Windows)
Simply double-click `run.bat` or run in terminal:
```powershell
.\run.bat
```
*(The script will automatically set up the virtual environment, install dependencies, and launch the widget).*

### 3. Manual Setup (Alternative)
```powershell
# Clone the repository
git clone https://github.com/altoriwan/TaskbarDice-.git
cd TaskbarDice-

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Launch application
python app.py
```

---

## 🎮 Controls

| Action | Control |
|---|---|
| **Add Task** | Type task into the input box, select Weight (`W`) & Time (`T`), then press `Enter` or click `ADD` |
| **Inspect Task** | Hover mouse cursor over any resting die on the stack |
| **Complete Task** | Double-click any resting die to open the anti-slacking confirmation dialog |
| **Move Window** | Click and drag the top title header (`TASKBAR DICE`) |
| **Close Window** | Click the red `X` button at the top right |

---

## 📄 License
MIT License
