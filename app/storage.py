import sqlite3
import os
from datetime import datetime
from typing import List, Optional, Tuple
from app.schemas import TaskItem, BatchSummary

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "deadline_heavyweight.db")

def get_connection() -> sqlite3.Connection:
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=15.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes tables for persistent batch and task storage."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS batches (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                raw_text TEXT NOT NULL,
                total_tasks INTEGER NOT NULL,
                total_duration_hours REAL NOT NULL,
                average_weight REAL NOT NULL,
                overall_stress_state TEXT NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                batch_id TEXT NOT NULL,
                title TEXT NOT NULL,
                raw_snippet TEXT NOT NULL,
                deadline_str TEXT NOT NULL,
                hours_remaining REAL NOT NULL,
                estimated_duration REAL NOT NULL,
                urgency_score REAL NOT NULL,
                difficulty_score REAL NOT NULL,
                weight_score INTEGER NOT NULL,
                stress_level TEXT NOT NULL,
                FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
            )
        """)
        conn.commit()

def save_batch(batch_id: str, raw_text: str, tasks: List[TaskItem], summary: BatchSummary):
    with get_connection() as conn:
        cursor = conn.cursor()
        created_at = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO batches (id, created_at, raw_text, total_tasks, total_duration_hours, average_weight, overall_stress_state)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            batch_id, created_at, raw_text, summary.total_tasks,
            summary.total_duration_hours, summary.average_weight, summary.overall_stress_state
        ))
        
        for task in tasks:
            cursor.execute("""
                INSERT INTO tasks (
                    id, batch_id, title, raw_snippet, deadline_str,
                    hours_remaining, estimated_duration, urgency_score,
                    difficulty_score, weight_score, stress_level
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                task.id, batch_id, task.title, task.raw_snippet, task.deadline_str,
                task.hours_remaining, task.estimated_duration, task.urgency_score,
                task.difficulty_score, task.weight_score, task.stress_level
            ))
        conn.commit()

def get_latest_batch() -> Optional[Tuple[BatchSummary, List[TaskItem], str]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM batches ORDER BY created_at DESC LIMIT 1")
        batch_row = cursor.fetchone()
        if not batch_row:
            return None
            
        batch_id = batch_row["id"]
        summary = BatchSummary(
            total_tasks=batch_row["total_tasks"],
            total_duration_hours=batch_row["total_duration_hours"],
            max_urgency=0.0,
            average_weight=batch_row["average_weight"],
            critical_count=0,
            overall_stress_state=batch_row["overall_stress_state"]
        )
        
        cursor.execute("SELECT * FROM tasks WHERE batch_id = ?", (batch_id,))
        task_rows = cursor.fetchall()
        tasks: List[TaskItem] = []
        for r in task_rows:
            task = TaskItem(
                id=r["id"],
                title=r["title"],
                raw_snippet=r["raw_snippet"],
                deadline_str=r["deadline_str"],
                hours_remaining=r["hours_remaining"],
                estimated_duration=r["estimated_duration"],
                urgency_score=r["urgency_score"],
                difficulty_score=r["difficulty_score"],
                weight_score=r["weight_score"],
                stress_level=r["stress_level"]
            )
            tasks.append(task)
            
        if tasks:
            summary.max_urgency = max(t.urgency_score for t in tasks)
            summary.critical_count = sum(1 for t in tasks if t.stress_level == "critical")
            
        return summary, tasks, batch_row["raw_text"]
