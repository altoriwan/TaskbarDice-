import re
import uuid
import math
from typing import List, Tuple
from app.schemas import TaskItem, BatchSummary

# Keyword rules for Vietnamese & English
URGENT_KEYWORDS = [
    # English
    r"\basap\b", r"\burgent\b", r"\bcritical\b", r"\bemergency\b", r"\bimmediately\b",
    r"\bright now\b", r"\bhigh priority\b", r"\bp0\b", r"\bp1\b",
    # Vietnamese
    r"\bgấp\b", r"\bkhẩn\b", r"\bhỏa tốc\b", r"\bngay lập tức\b", r"\bưu tiên cao\b",
    r"\bcháy deadline\b", r"\btrễ hạn\b", r"\bquá hạn\b", r"\bngay và luôn\b"
]

TODAY_KEYWORDS = [
    r"\btoday\b", r"\btonight\b", r"\beod\b", r"\bend of day\b",
    r"\bhôm nay\b", r"\bchiều nay\b", r"\btối nay\b", r"\bsáng nay\b", r"\btrưa nay\b"
]

TOMORROW_KEYWORDS = [
    r"\btomorrow\b", r"\bnext day\b",
    r"\bngày mai\b", r"\bmai\b", r"\btối mai\b", r"\bchiều mai\b", r"\bsáng mai\b"
]

HIGH_DIFFICULTY_KEYWORDS = [
    r"\brefactor\b", r"\bmigrate\b", r"\bdebug\b", r"\barchitecture\b", r"\brewrite\b",
    r"\bdeploy\b", r"\baudit\b", r"\bsecurity\b", r"\bbenchmark\b", r"\boptimize\b",
    r"\btối ưu\b", r"\bsửa lỗi\b", r"\bnghiên cứu\b", r"\bkiến trúc\b", r"\bcấu trúc lại\b",
    r"\btích hợp\b", r"\bxây dựng\b"
]

LOW_DIFFICULTY_KEYWORDS = [
    r"\bemail\b", r"\bgửi mail\b", r"\bcall\b", r"\bgọi điện\b", r"\bmeeting\b", r"\bhọp\b",
    r"\bcheck\b", r"\bupdate\b", r"\bcập nhật\b", r"\bnhắn\b", r"\border\b", r"\bđọc tài liệu\b"
]

MAX_SAFE_DURATION_HOURS = 168.0  # 1 week cap
MIN_SAFE_DURATION_HOURS = 0.25   # 15 minutes minimum

def sanitize_string(text: str) -> str:
    """Removes null bytes and non-printable control characters."""
    if not text:
        return ""
    # Strip null bytes and non-newline/tab control characters
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    return cleaned.strip()

def clean_task_title(raw: str) -> str:
    """Strip leading bullets, numbers, formatting brackets, and trim whitespace."""
    sanitized = sanitize_string(raw)
    # Ignore purely divider lines consisting only of dashes, equals, asterisks, hashes
    if re.match(r"^[\s\-\=\_\*\~\#\.\:]+$", sanitized):
        return ""
    # Remove leading bullets, numbers, dashes
    cleaned = re.sub(r"^[\s\*\-\•\–\—\>0-9\.\)\:]+", "", sanitized).strip()
    # Normalize matched enclosing brackets like [P0 KHẨN] or (Urgent)
    cleaned = re.sub(r"^\[.*?\]\s*", "", cleaned).strip()
    return cleaned if cleaned else ""

def extract_duration(text: str) -> float:
    """Extract duration in hours with defensive clamping to prevent overflow or NaN."""
    lower = sanitize_string(text).lower()
    
    try:
        # Check for hours first: e.g. "3h", "3.5 tiếng", "4 hours", "2 giờ"
        hour_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:tiếng|giờ|hours?|hrs?|h)\b", lower)
        if hour_match:
            hours = float(hour_match.group(1))
            return max(MIN_SAFE_DURATION_HOURS, min(MAX_SAFE_DURATION_HOURS, hours))
            
        # Check for minutes: e.g. "30 phút", "45 mins"
        min_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:phút|mins?|minutes?)\b", lower)
        if min_match:
            mins = float(min_match.group(1))
            hours = round(mins / 60.0, 2)
            return max(MIN_SAFE_DURATION_HOURS, min(MAX_SAFE_DURATION_HOURS, hours))

        # Check for days: e.g. "2 ngày", "2 days", "3d" (excluding relative deadline markers like 'in 2 days', 'sau 2 ngày')
        if not re.search(r"(?:in|within|sau|còn|trong)\s+\d+\s*(?:ngày|days?|d)\b", lower):
            day_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:ngày|days?|d)\b", lower)
            if day_match:
                days = float(day_match.group(1))
                hours = days * 8.0
                return max(MIN_SAFE_DURATION_HOURS, min(MAX_SAFE_DURATION_HOURS, hours))
    except (ValueError, OverflowError):
        return 4.0  # Fallback on parse overflow
        
    # Keyword-based inference
    for kw in HIGH_DIFFICULTY_KEYWORDS:
        if re.search(kw, lower):
            return 4.0
    for kw in LOW_DIFFICULTY_KEYWORDS:
        if re.search(kw, lower):
            return 0.75
            
    return 2.0  # sensible default

def extract_deadline_and_hours_remaining(text: str) -> Tuple[str, float, float]:
    """
    Returns (deadline_str, hours_remaining, urgency_score 1.0-10.0) with defensive bounds.
    """
    lower = sanitize_string(text).lower()
    
    # 1. Immediate / Urgent
    for kw in URGENT_KEYWORDS:
        if re.search(kw, lower):
            return ("ASAP / Urgent", 2.0, 9.8)
            
    # 2. Specific time expressions: e.g. "trước 17h", "deadline 15:30", "before 5pm"
    specific_time = re.search(r"(?:trước|deadline|hạn|by|before|at)\s*(\d{1,2})(?:h|:(\d{2}))?\s*(pm|am|chiều|tối)?", lower)
    if specific_time:
        target_hour = int(specific_time.group(1))
        meridiem = specific_time.group(3)
        if meridiem in ["pm", "chiều", "tối"] and target_hour < 12:
            target_hour += 12
        return (f"Target {target_hour}:00", 6.0, 8.8)

    # 3. Today / tonight
    for kw in TODAY_KEYWORDS:
        if re.search(kw, lower):
            return ("Today / Tối nay", 6.0, 8.5)
            
    # 4. Tomorrow
    for kw in TOMORROW_KEYWORDS:
        if re.search(kw, lower):
            return ("Tomorrow / Ngày mai", 24.0, 7.0)
            
    # 5. Relative days: e.g. "in 3 days", "3 ngày nữa"
    days_match = re.search(r"(\d+)\s*(?:ngày nữa|days?|d)\b", lower)
    if days_match:
        try:
            days = min(365.0, max(0.5, float(days_match.group(1))))
            hours = days * 24.0
            urgency = max(2.0, 8.0 - (days * 1.5))
            return (f"{int(days)} days left", hours, round(urgency, 1))
        except (ValueError, OverflowError):
            pass
            
    # Default fallback
    return ("Flexible / Standard", 36.0, 4.5)

def calculate_difficulty(text: str) -> float:
    lower = sanitize_string(text).lower()
    for kw in HIGH_DIFFICULTY_KEYWORDS:
        if re.search(kw, lower):
            return 8.5
    for kw in LOW_DIFFICULTY_KEYWORDS:
        if re.search(kw, lower):
            return 2.5
    return 5.0

def calculate_composite_weight(duration: float, hours_left: float, urgency: float, difficulty: float) -> Tuple[int, str]:
    """
    Computes a 1-100 visceral weight score and categorical stress level.
    Guaranteed to return finite, non-NaN integer between 1 and 100.
    """
    # Defensive normalization
    safe_duration = max(MIN_SAFE_DURATION_HOURS, min(MAX_SAFE_DURATION_HOURS, float(duration))) if not math.isnan(duration) else 2.0
    safe_hours = max(0.5, min(720.0, float(hours_left))) if not math.isnan(hours_left) else 24.0
    safe_urgency = max(1.0, min(10.0, float(urgency))) if not math.isnan(urgency) else 5.0
    safe_difficulty = max(1.0, min(10.0, float(difficulty))) if not math.isnan(difficulty) else 5.0

    ratio = safe_duration / safe_hours
    
    # Base formula from 1 to 100
    base_score = (safe_urgency * 5.5) + (min(safe_duration, 12.0) * 2.5) + (safe_difficulty * 1.5)
    
    # Apply compression ratio multiplier if time crunch is tight
    if ratio > 0.8:
        base_score += 25.0 * min(3.0, ratio)
    elif ratio > 0.4:
        base_score += 12.0 * ratio
        
    clamped_weight = int(max(1, min(100, round(base_score))))
    
    if clamped_weight <= 35:
        stress_level = "calm"
    elif clamped_weight <= 70:
        stress_level = "elevated"
    else:
        stress_level = "critical"
        
    return clamped_weight, stress_level

def parse_raw_text(raw_text: str) -> Tuple[List[TaskItem], BatchSummary]:
    """
    Deterministic rule-based parser that segments raw unformatted text
    into discrete TaskItems with physical and psychological parameters.
    Sanitized against unbounded inputs, null bytes, and NaN anomalies.
    """
    sanitized_input = sanitize_string(raw_text)
    lines = [line.strip() for line in sanitized_input.splitlines() if line.strip()]
    tasks: List[TaskItem] = []
    
    for line in lines:
        title = clean_task_title(line)
        if len(title) < 2:
            continue
            
        deadline_str, hours_left, urgency = extract_deadline_and_hours_remaining(line)
        duration = extract_duration(line)
        difficulty = calculate_difficulty(line)
        weight_score, stress_level = calculate_composite_weight(
            duration, hours_left, urgency, difficulty
        )
        
        task = TaskItem(
            id=str(uuid.uuid4())[:8],
            title=title,
            raw_snippet=line,
            deadline_str=deadline_str,
            hours_remaining=hours_left,
            estimated_duration=duration,
            urgency_score=urgency,
            difficulty_score=difficulty,
            weight_score=weight_score,
            stress_level=stress_level
        )
        tasks.append(task)
        
    # Aggregate Batch Summary
    total_tasks = len(tasks)
    total_duration = round(sum(t.estimated_duration for t in tasks), 2)
    max_urgency = max((t.urgency_score for t in tasks), default=0.0)
    avg_weight = round(sum(t.weight_score for t in tasks) / max(1, total_tasks), 1)
    critical_count = sum(1 for t in tasks if t.stress_level == "critical")
    
    if avg_weight <= 35:
        overall_state = "calm"
    elif avg_weight <= 70:
        overall_state = "elevated"
    else:
        overall_state = "critical"
        
    summary = BatchSummary(
        total_tasks=total_tasks,
        total_duration_hours=total_duration,
        max_urgency=max_urgency,
        average_weight=avg_weight,
        critical_count=critical_count,
        overall_stress_state=overall_state
    )
    
    return tasks, summary
