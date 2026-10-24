from typing import List, Optional
from pydantic import BaseModel, Field

class TaskItem(BaseModel):
    id: str = Field(..., description="Unique identifier for the task")
    title: str = Field(..., description="Cleaned task title")
    raw_snippet: str = Field(..., description="Original text line or snippet")
    deadline_str: str = Field(default="Unspecified", description="Extracted deadline expression")
    hours_remaining: float = Field(default=24.0, description="Estimated hours left until deadline")
    estimated_duration: float = Field(default=2.0, description="Estimated hours of effort required")
    urgency_score: float = Field(default=5.0, description="Urgency index from 1.0 to 10.0")
    difficulty_score: float = Field(default=5.0, description="Cognitive difficulty from 1.0 to 10.0")
    weight_score: int = Field(default=50, ge=1, le=100, description="Composite psychological stress weight (1-100)")
    stress_level: str = Field(default="elevated", description="'calm' (1-35), 'elevated' (36-70), or 'critical' (71-100)")

class ParseRequest(BaseModel):
    raw_text: str = Field(..., description="Raw pasted tasks and deadlines")
    use_llm: bool = Field(default=False, description="Whether to route through LLM adapter if configured")

class BatchSummary(BaseModel):
    total_tasks: int
    total_duration_hours: float
    max_urgency: float
    average_weight: float
    critical_count: int
    overall_stress_state: str  # "calm" | "elevated" | "critical"

class ParseResponse(BaseModel):
    success: bool
    batch_id: str
    tasks: List[TaskItem]
    summary: BatchSummary
