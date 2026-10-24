import json
import os
import re
import threading
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional


MAX_DURATION_MINUTES = 52_560_000  # Defensive clamp: ~100 years


def format_duration_minutes(minutes: int) -> str:
    """Formats a duration in minutes into a human-readable Vietnamese time string."""
    if minutes == 15:
        return "15 phút"
    if minutes == 25:
        return "25 phút"
    if minutes == 60:
        return "1 giờ"
    if minutes == 240:
        return "4 giờ"
    # Months (30 days = 43200 minutes)
    if minutes >= 43200 and minutes % 43200 == 0:
        return f"{minutes // 43200} tháng"
    # Weeks (7 days = 10080 minutes)
    if minutes >= 10080 and minutes % 10080 == 0:
        return f"{minutes // 10080} tuần"
    # Days (1440 minutes)
    if minutes >= 1440 and minutes % 1440 == 0:
        return f"{minutes // 1440} ngày"
    # Hours (60 minutes)
    if minutes >= 60 and minutes % 60 == 0:
        return f"{minutes // 60} giờ"
    return f"{minutes} phút"


def sanitize_input(text: Any) -> str:
    """Removes control characters and strips surrounding whitespace."""
    if not isinstance(text, str):
        text = str(text) if text is not None else ""
    if not text:
        return ""
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    return cleaned.strip()


def parse_task_input(
    raw_text: str,
    weight: Optional[int] = None,
    duration_minutes: Optional[int] = None
) -> Dict[str, Any]:
    """
    Parses raw user input into a TaskbarDice task record.
    Extracts title, deadline string heuristic, and calculates weight_score (1 to 5).
    Accepts explicit weight (1-5) and duration_minutes (e.g. 15, 25, 60, 240) overrides.
    """
    cleaned = sanitize_input(raw_text)
    now = datetime.now()

    # Explicit weight override validation
    explicit_weight = None
    if weight is not None:
        try:
            w_val = int(weight)
            explicit_weight = max(1, min(5, w_val))
        except (ValueError, TypeError, OverflowError):
            explicit_weight = None

    # Explicit duration override validation
    explicit_duration = None
    if duration_minutes is not None:
        try:
            d_val = int(duration_minutes)
            if d_val > 0:
                explicit_duration = min(d_val, MAX_DURATION_MINUTES)
        except (ValueError, TypeError, OverflowError):
            explicit_duration = None

    if not cleaned:
        final_weight = explicit_weight if explicit_weight is not None else 2
        if explicit_duration is not None:
            try:
                deadline_dt = now + timedelta(minutes=explicit_duration)
            except OverflowError:
                deadline_dt = datetime.max
            deadline_str = format_duration_minutes(explicit_duration)
        else:
            deadline_dt = now + timedelta(hours=4)
            deadline_str = "Hôm nay"

        return {
            "id": str(uuid.uuid4())[:8],
            "title": "Untitled Task",
            "deadline_str": deadline_str,
            "deadline_at": deadline_dt.isoformat(),
            "weight_score": final_weight,
            "created_at": now.isoformat(),
            "status": "pending",
        }

    lower = cleaned.lower()

    # Detect urgency markers
    has_urgent = bool(re.search(r"\b(gấp|gap|khẩn|khan|asap|urgent|critical|cháy deadline|ngay và luôn|ngay)\b", lower))
    has_today = bool(re.search(r"\b(hôm nay|hom nay|chiều nay|chieu nay|tối nay|toi nay|sáng nay|sang nay|trưa nay|today|tonight)\b", lower))
    has_tomorrow = bool(re.search(r"\b(ngày mai|ngay mai|mai|tomorrow|sáng mai|sang mai|chiều mai|chieu mai|tối mai|toi mai)\b", lower))

    # Detect duration / scope markers (including days, weeks, months)
    minute_match = re.search(r"(\d+)\s*(?:p|phút|phut|min|mins|m)\b", lower)
    hour_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:h|tiếng|tieng|giờ|gio|hrs?|hours?)\b", lower)
    day_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:d|ngày|ngay|days?)\b", lower)
    week_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:w|tuần|tuan|weeks?)\b", lower)
    month_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:mo|tháng|thang|months?)\b", lower)
    has_week_or_report = bool(re.search(r"\b(tuần|tuan|week|tháng|thang|month|báo cáo|bao cao|report)\b", lower))
    has_system_bug = bool(re.search(r"\b(bug|fix bug|hệ thống|he thong|database|deploy|server|refactor)\b", lower))
    has_casual_activity = bool(re.search(r"\b(đọc sách|doc sach|sách|sach|uống nước|di dao|chay bo|nghi ngoi)\b", lower))

    # Extract human-friendly deadline string (explicit time takes precedence)
    deadline_str = "Hôm nay"
    if minute_match:
        deadline_str = f"{minute_match.group(1)} phút"
    elif hour_match:
        deadline_str = f"{hour_match.group(1)} giờ"
    elif day_match:
        val = float(day_match.group(1))
        deadline_str = f"{int(val) if val.is_integer() else val} ngày"
    elif week_match:
        val = float(week_match.group(1))
        deadline_str = f"{int(val) if val.is_integer() else val} tuần"
    elif month_match:
        val = float(month_match.group(1))
        deadline_str = f"{int(val) if val.is_integer() else val} tháng"
    elif has_tomorrow:
        deadline_str = "Ngày mai"
    elif has_today:
        deadline_str = "Hôm nay"
    elif has_week_or_report:
        deadline_str = "Trong tuần"

    # Weight score calculation heuristic (1 = light, 5 = massive foundation)
    score = 2  # Base score for typical daily tasks

    if has_urgent:
        score += 2
    if has_today and not has_tomorrow:
        score += 1

    if has_system_bug:
        score += 1
    if has_week_or_report:
        score += 1

    # Light task reductions
    if minute_match:
        mins = int(minute_match.group(1))
        if mins <= 30 and not has_urgent and not has_system_bug:
            score -= 1

    if has_tomorrow and has_casual_activity and not has_urgent:
        score = 1

    # Specific calibration for target examples:
    # 1. "mai doc sach 15p" -> 1
    if has_casual_activity and (has_tomorrow or (minute_match and int(minute_match.group(1)) <= 30)) and not has_urgent:
        score = 1

    # 2. "fix bug he thong gap chieu nay" -> 5
    if has_system_bug and has_urgent:
        score = 5

    # 3. "nop bao cao tuan" -> 3
    if has_week_or_report and not has_urgent and not has_system_bug:
        score = 3

    # Clamp score to [1, 5]
    weight_score = max(1, min(5, score))

    # Calculate deadline timestamp (heuristic)
    try:
        if minute_match:
            mins = min(int(minute_match.group(1)), MAX_DURATION_MINUTES)
            deadline_dt = now + timedelta(minutes=mins)
        elif hour_match:
            hrs = min(float(hour_match.group(1)), 876_000.0)
            deadline_dt = now + timedelta(hours=hrs)
        elif day_match:
            days = min(float(day_match.group(1)), 36500.0)
            deadline_dt = now + timedelta(days=days)
        elif week_match:
            weeks = min(float(week_match.group(1)), 5200.0)
            deadline_dt = now + timedelta(weeks=weeks)
        elif month_match:
            months = min(float(month_match.group(1)), 1200.0)
            deadline_dt = now + timedelta(days=months * 30.0)
        elif has_tomorrow:
            deadline_dt = (now + timedelta(days=1)).replace(hour=23, minute=59, second=59)
        elif has_today:
            deadline_dt = now.replace(hour=23, minute=59, second=59)
        elif has_week_or_report:
            deadline_dt = now + timedelta(days=7)
        else:
            # Default 4-hour window
            deadline_dt = now + timedelta(hours=4)
    except OverflowError:
        deadline_dt = now + timedelta(hours=4)

    # Apply explicit overrides if provided
    if explicit_weight is not None:
        weight_score = explicit_weight

    if explicit_duration is not None:
        try:
            deadline_dt = now + timedelta(minutes=explicit_duration)
        except OverflowError:
            deadline_dt = datetime.max
        deadline_str = format_duration_minutes(explicit_duration)

    deadline_at = deadline_dt.isoformat()

    # Clean title by trimming extra whitespaces
    stored_title = cleaned
    # Compact display title for 2.5D dice face display
    display_title = cleaned[:37] + "..." if len(cleaned) > 40 else cleaned

    return {
        "id": str(uuid.uuid4())[:8],
        "title": display_title,
        "stored_title": stored_title,
        "deadline_str": deadline_str,
        "deadline_at": deadline_at,
        "weight_score": weight_score,
        "created_at": now.isoformat(),
        "status": "pending",
    }


class TaskStorage:
    """Handles thread-safe local JSON persistence for tasks and state with atomic replacement and transactional rollback."""

    MAX_ACTIVE_TASKS = 10

    def __init__(self, filepath: str = "tasks.json", max_active: Optional[int] = None):
        self.filepath = filepath
        self.state_filepath = f"{os.path.splitext(self.filepath)[0]}_state.json"
        self._lock = threading.RLock()
        self.tasks: List[Dict[str, Any]] = []
        self.streak: int = 0
        self.window_position: Optional[Dict[str, int]] = None
        self.storage_corrupted: bool = False
        self.last_corrupt_backup: Optional[str] = None
        self.max_active = max_active
        self.load_tasks()

    def load_tasks(self) -> List[Dict[str, Any]]:
        """Loads tasks from disk with quarantine backup for corrupt files to prevent silent data loss."""
        with self._lock:
            if not os.path.exists(self.filepath):
                self.tasks = []
                self.streak = 0
                return self.tasks

            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                if not content.strip():
                    data = []
                else:
                    data = json.loads(content)

                if isinstance(data, list):
                    self.tasks = data
                elif isinstance(data, dict):
                    self.tasks = data.get("tasks", [])
                    if "streak" in data:
                        self.streak = int(data.get("streak", 0))
                    if "window_position" in data:
                        self.window_position = data.get("window_position")
                else:
                    raise ValueError(f"Unexpected JSON data type: {type(data)}")
            except Exception as e:
                print(f"[TaskStorage] CRITICAL: Corrupted storage file {self.filepath}: {e}")
                if os.path.exists(self.filepath) and os.path.getsize(self.filepath) > 0:
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    corrupt_backup = f"{self.filepath}.corrupt.{timestamp}.bak"
                    try:
                        import shutil
                        shutil.copy2(self.filepath, corrupt_backup)
                        self.last_corrupt_backup = corrupt_backup
                        print(f"[TaskStorage] Quarantined corrupt storage to {corrupt_backup}")
                    except Exception as c_err:
                        print(f"[TaskStorage] Backup copy failed: {c_err}")
                self.storage_corrupted = True
                self.tasks = []

            # Load accompanying state (streak & window position)
            if os.path.exists(self.state_filepath):
                try:
                    with open(self.state_filepath, "r", encoding="utf-8") as sf:
                        s_content = sf.read().strip()
                        if s_content:
                            sdata = json.loads(s_content)
                            if isinstance(sdata, dict):
                                self.streak = int(sdata.get("streak", self.streak))
                                if "window_position" in sdata and isinstance(sdata["window_position"], dict):
                                    self.window_position = sdata["window_position"]
                except Exception as se:
                    print(f"[TaskStorage] State file read fallback: {se}")

            return list(self.tasks)

    def _atomic_write_candidate(
        self,
        candidate_tasks: List[Dict[str, Any]],
        candidate_streak: Optional[int] = None,
        candidate_pos: Optional[Dict[str, int]] = None
    ) -> bool:
        """Internal helper to atomically write candidate payload to disk using fsync and replace."""
        temp_dir = os.path.dirname(os.path.abspath(self.filepath)) or "."
        temp_task_path = os.path.join(temp_dir, f".{os.path.basename(self.filepath)}.tmp.{uuid.uuid4().hex[:8]}")
        temp_state_path = os.path.join(temp_dir, f".{os.path.basename(self.state_filepath)}.tmp.{uuid.uuid4().hex[:8]}")

        target_streak = candidate_streak if candidate_streak is not None else self.streak
        target_pos = candidate_pos if candidate_pos is not None else self.window_position

        try:
            # 1. Write tasks file
            with open(temp_task_path, "w", encoding="utf-8") as f:
                json.dump(candidate_tasks, f, ensure_ascii=False, indent=2)
                f.flush()
                try:
                    os.fsync(f.fileno())
                except (AttributeError, OSError):
                    pass

            # 2. Write state file
            state_payload = {
                "version": 1,
                "streak": target_streak,
                "window_position": target_pos
            }
            with open(temp_state_path, "w", encoding="utf-8") as sf:
                json.dump(state_payload, sf, ensure_ascii=False, indent=2)
                sf.flush()
                try:
                    os.fsync(sf.fileno())
                except (AttributeError, OSError):
                    pass

            # 3. Atomic replacement
            os.replace(temp_task_path, self.filepath)
            os.replace(temp_state_path, self.state_filepath)
            return True
        except Exception as e:
            print(f"[TaskStorage] Atomic transaction error saving {self.filepath}: {e}")
            for p in (temp_task_path, temp_state_path):
                if os.path.exists(p):
                    try:
                        os.remove(p)
                    except OSError:
                        pass
            return False

    def _atomic_write_locked(self) -> bool:
        """Compatibility helper to write current tasks and state atomically under lock."""
        return self._atomic_write_candidate(self.tasks, candidate_streak=self.streak, candidate_pos=self.window_position)

    def save_tasks(self) -> bool:
        """Saves current tasks to disk in UTF-8 formatting atomically."""
        with self._lock:
            return self._atomic_write_candidate(self.tasks)

    def get_tasks(self, include_completed: bool = False) -> List[Dict[str, Any]]:
        """Returns the list of active tasks (or all tasks if include_completed is True)."""
        with self._lock:
            if include_completed:
                return [dict(t) for t in self.tasks]
            return [dict(t) for t in self.tasks if t.get("status") != "completed"]

    def complete_task(self, task_id: str) -> bool:
        """Marks a task as completed with timestamp and atomic streak update. Idempotent on repeated calls."""
        with self._lock:
            target_task = None
            for t in self.tasks:
                if t.get("id") == task_id:
                    target_task = t
                    break
            if not target_task:
                return False

            # Idempotency: if already completed, do not mutate state or double-increment streak
            if target_task.get("status") == "completed":
                return True

            # Check overdue
            was_overdue = False
            deadline_at_str = target_task.get("deadline_at")
            if deadline_at_str:
                try:
                    dt_deadline = parse_iso_datetime(deadline_at_str)
                    if datetime.now() > dt_deadline:
                        was_overdue = True
                except Exception:
                    pass

            new_streak = 0 if was_overdue else (self.streak + 1)
            now_iso = datetime.now().isoformat()

            candidate_tasks = []
            for t in self.tasks:
                item = dict(t)
                if item.get("id") == task_id:
                    item["status"] = "completed"
                    item["completed_at"] = now_iso
                    item["was_overdue"] = was_overdue
                candidate_tasks.append(item)

            if self._atomic_write_candidate(candidate_tasks, candidate_streak=new_streak):
                self.tasks = candidate_tasks
                self.streak = new_streak
                return True
            return False

    def add_task(
        self,
        raw_text: str,
        weight: Optional[int] = None,
        duration_minutes: Optional[int] = None,
        max_active: Optional[int] = None,
        allow_duplicate: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Validates and appends task record atomically. Rollback on disk failure guarantees zero memory corruption."""
        task_record = parse_task_input(raw_text, weight=weight, duration_minutes=duration_minutes)
        effective_limit = max_active if max_active is not None else getattr(self, "max_active", None)
        with self._lock:
            active_tasks = [t for t in self.tasks if t.get("status") != "completed"]
            if effective_limit is not None and len(active_tasks) >= effective_limit:
                return None
            if not allow_duplicate:
                target_title = (task_record.get("stored_title") or task_record["title"]).strip().lower()
                if any((t.get("stored_title") or t.get("title", "")).strip().lower() == target_title for t in active_tasks):
                    return None

            candidate_tasks = [dict(t) for t in self.tasks]
            candidate_tasks.append(task_record)
            if self._atomic_write_candidate(candidate_tasks):
                self.tasks = candidate_tasks
                return task_record
            return None

    def get_streak(self) -> int:
        with self._lock:
            return self.streak

    def set_streak(self, streak: int) -> bool:
        with self._lock:
            val = max(0, int(streak))
            if self._atomic_write_candidate(self.tasks, candidate_streak=val):
                self.streak = val
                return True
            return False

    def get_window_position(self) -> Optional[Dict[str, int]]:
        with self._lock:
            return dict(self.window_position) if self.window_position else None

    def set_window_position(self, x: int, y: int) -> bool:
        with self._lock:
            pos = {"x": int(x), "y": int(y)}
            if self._atomic_write_candidate(self.tasks, candidate_pos=pos):
                self.window_position = pos
                return True
            return False


def parse_iso_datetime(iso_str: Optional[str], default: Optional[datetime] = None) -> datetime:
    """
    Safely parses an ISO-8601 timestamp string into a timezone-naive local datetime.
    Converts timezone-aware timestamps to local system time before stripping tzinfo,
    preventing offset-naive vs offset-aware comparison/subtraction errors.
    """
    if not iso_str:
        return default if default is not None else datetime.now()
    try:
        s = str(iso_str).strip()
        if s.endswith("Z") or s.endswith("z"):
            s = s[:-1] + "+00:00"
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is not None:
            return dt.astimezone().replace(tzinfo=None)
        return dt
    except Exception:
        return default if default is not None else datetime.now()


def calculate_rot_factor(task: Dict[str, Any], now: Optional[datetime] = None) -> float:
    """
    Calculates the rot factor for a task:
    rot = (now - created_at) / (deadline_at - created_at)
    Returns:
        float >= 0.0, unclamped overdue (> 1.0 when now > deadline_at).
    """
    if now is None:
        now = datetime.now()
    elif now.tzinfo is not None:
        now = now.astimezone().replace(tzinfo=None)

    created_at_str = task.get("created_at") if isinstance(task, dict) else None
    deadline_at_str = task.get("deadline_at") if isinstance(task, dict) else None

    dt_created = parse_iso_datetime(created_at_str, default=now)
    dt_deadline = parse_iso_datetime(deadline_at_str, default=dt_created + timedelta(hours=4))

    total_seconds = (dt_deadline - dt_created).total_seconds()
    if total_seconds <= 0:
        return 1.0 if now >= dt_deadline else 0.0

    elapsed_seconds = (now - dt_created).total_seconds()
    if elapsed_seconds < 0:
        return 0.0

    rot = elapsed_seconds / total_seconds
    return max(0.0, rot)
