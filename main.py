import os
import uuid
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import underlying parsing and storage utilities
try:
    from app.parser import parse_raw_text
    from app.storage import init_db, save_batch, get_latest_batch
    from app.schemas import ParseRequest, ParseResponse, TaskItem, BatchSummary
    from app.llm_adapter import LLMServiceAdapter
    HAS_APP_MODULE = True
except ImportError:
    HAS_APP_MODULE = False

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

# Pydantic Schemas for Rapier 3D physical representation
class PhysicalTask(BaseModel):
    id: str
    title: str
    material: str
    mass: float
    density: float
    restitution: float
    friction: float
    dimensions: List[float]
    shape: str
    color: str
    urgency: str
    hours_left: float
    stress_score: int
    weight_score: int = Field(default=50, description="1-100 psychological stress score")
    stress_level: str = Field(default="elevated", description="calm, elevated, critical")
    urgency_score: float = Field(default=5.0, description="1.0 to 10.0 urgency")
    estimated_duration: float = Field(default=2.0, description="Effort duration in hours")
    duration_hours: float = Field(default=2.0, description="Effort duration alias")
    deadline_str: str = Field(default="Hôm nay", description="Display deadline text")
    raw_snippet: Optional[str] = Field(default="", description="Original raw snippet")

class DeadlineAnalyzeRequest(BaseModel):
    raw_text: Optional[str] = Field(None, description="Raw block of task text and deadlines")
    title: Optional[str] = Field(None, description="Single task title")
    deadline_hours: Optional[float] = Field(None, description="Hours until deadline")
    urgency: Optional[str] = Field(None, description="Urgency level: low, medium, high, critical")
    use_llm: bool = Field(False, description="Whether to invoke LLM adapter if available")

class DeadlineAnalyzeResponse(BaseModel):
    success: bool
    batch_id: str
    summary: str
    total_weight_kg: float
    stress_index: float
    task_count: int
    tasks: List[PhysicalTask]

def compute_physics_properties(title: str, hours_remaining: float, weight_score: int, stress_level: str) -> Dict[str, Any]:
    """Computes Rapier 3D physical parameters based on deadline stress."""
    if weight_score >= 80 or stress_level == "critical" or hours_remaining <= 4:
        material = "tungsten"
        mass = round(float(weight_score) * 4.5, 2)  # up to 450kg
        density = 19.3
        restitution = 0.05
        friction = 0.8
        shape = "box"
        dimensions = [1.8, 1.8, 1.8]
        color = "#ef4444" # red-500
        urgency = "critical"
    elif weight_score >= 60 or hours_remaining <= 12:
        material = "iron"
        mass = round(float(weight_score) * 2.0, 2)
        density = 7.87
        restitution = 0.15
        friction = 0.7
        shape = "box"
        dimensions = [1.5, 1.5, 1.5]
        color = "#f97316" # orange-500
        urgency = "high"
    elif weight_score >= 40 or hours_remaining <= 24:
        material = "wood"
        mass = round(float(weight_score) * 0.8, 2)
        density = 0.7
        restitution = 0.35
        friction = 0.6
        shape = "box"
        dimensions = [1.3, 1.3, 1.3]
        color = "#eab308" # yellow-500
        urgency = "medium"
    elif weight_score >= 20:
        material = "glass"
        mass = round(float(weight_score) * 0.4, 2)
        density = 2.5
        restitution = 0.5
        friction = 0.4
        shape = "box"
        dimensions = [1.1, 1.1, 1.1]
        color = "#06b6d4" # cyan-500
        urgency = "low"
    else:
        material = "cardboard"
        mass = max(1.0, round(float(weight_score) * 0.15, 2))
        density = 0.2
        restitution = 0.65
        friction = 0.5
        shape = "box"
        dimensions = [0.9, 0.9, 0.9]
        color = "#10b981" # emerald-500
        urgency = "calm"

    return {
        "material": material,
        "mass": mass,
        "density": density,
        "restitution": restitution,
        "friction": friction,
        "dimensions": dimensions,
        "shape": shape,
        "color": color,
        "urgency": urgency
    }

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(STATIC_DIR, exist_ok=True)
    if HAS_APP_MODULE:
        try:
            init_db()
        except Exception as e:
            print(f"[WARN] Database init warning: {e}")
    yield

app = FastAPI(
    title="Deadline Heavyweight",
    description="Physical 3D Workload & Stress Visualizer with Rapier 3D WASM",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "app": "Deadline Heavyweight",
        "version": "2.0.0",
        "engine": "Rapier 3D WASM"
    }

@app.post("/api/analyze-deadline", response_model=DeadlineAnalyzeResponse)
def analyze_deadline(payload: DeadlineAnalyzeRequest):
    batch_id = str(uuid.uuid4())[:8]
    tasks_result: List[PhysicalTask] = []
    
    # Mode 1: Raw text block parsing
    if payload.raw_text and payload.raw_text.strip():
        if HAS_APP_MODULE:
            llm_adapter = LLMServiceAdapter()
            raw_tasks, summary = llm_adapter.parse(payload.raw_text, force_llm=payload.use_llm)
            if not raw_tasks:
                raise HTTPException(status_code=422, detail="No readable tasks detected in provided text")
            
            save_batch(batch_id, payload.raw_text, raw_tasks, summary)
            
            total_mass = 0.0
            total_stress = 0.0
            for t in raw_tasks:
                props = compute_physics_properties(
                    title=t.title,
                    hours_remaining=t.hours_remaining,
                    weight_score=t.weight_score,
                    stress_level=t.stress_level
                )
                phys_task = PhysicalTask(
                    id=t.id,
                    title=t.title,
                    material=props["material"],
                    mass=props["mass"],
                    density=props["density"],
                    restitution=props["restitution"],
                    friction=props["friction"],
                    dimensions=props["dimensions"],
                    shape=props["shape"],
                    color=props["color"],
                    urgency=props["urgency"],
                    hours_left=t.hours_remaining,
                    stress_score=t.weight_score,
                    weight_score=t.weight_score,
                    stress_level=t.stress_level,
                    urgency_score=t.urgency_score,
                    estimated_duration=t.estimated_duration,
                    duration_hours=t.estimated_duration,
                    deadline_str=t.deadline_str,
                    raw_snippet=t.raw_snippet
                )
                tasks_result.append(phys_task)
                total_mass += props["mass"]
                total_stress += t.weight_score
                
            avg_stress = round(total_stress / len(tasks_result), 1) if tasks_result else 0.0
            return DeadlineAnalyzeResponse(
                success=True,
                batch_id=batch_id,
                summary=f"Detected {len(tasks_result)} tasks with total physical mass of {round(total_mass, 1)} kg.",
                total_weight_kg=round(total_mass, 2),
                stress_index=avg_stress,
                task_count=len(tasks_result),
                tasks=tasks_result
            )
        else:
            # Fallback simple parser
            lines = [l.strip() for l in payload.raw_text.splitlines() if l.strip()]
            for idx, line in enumerate(lines):
                props = compute_physics_properties(line, 12.0, 50, "elevated")
                tasks_result.append(PhysicalTask(
                    id=f"task-{idx+1}",
                    title=line,
                    material=props["material"],
                    mass=props["mass"],
                    density=props["density"],
                    restitution=props["restitution"],
                    friction=props["friction"],
                    dimensions=props["dimensions"],
                    shape=props["shape"],
                    color=props["color"],
                    urgency=props["urgency"],
                    hours_left=12.0,
                    stress_score=50
                ))
            return DeadlineAnalyzeResponse(
                success=True,
                batch_id=batch_id,
                summary=f"Parsed {len(tasks_result)} standalone tasks.",
                total_weight_kg=sum(t.mass for t in tasks_result),
                stress_index=50.0,
                task_count=len(tasks_result),
                tasks=tasks_result
            )

    # Mode 2: Single task parameter input
    elif payload.title and payload.title.strip():
        hours = payload.deadline_hours if payload.deadline_hours is not None else 24.0
        urg = (payload.urgency or "medium").lower()
        score_map = {"calm": 20, "low": 30, "medium": 50, "high": 75, "critical": 95}
        score = score_map.get(urg, 50)
        props = compute_physics_properties(payload.title, hours, score, urg)
        task = PhysicalTask(
            id=f"task-{str(uuid.uuid4())[:6]}",
            title=payload.title.strip(),
            material=props["material"],
            mass=props["mass"],
            density=props["density"],
            restitution=props["restitution"],
            friction=props["friction"],
            dimensions=props["dimensions"],
            shape=props["shape"],
            color=props["color"],
            urgency=props["urgency"],
            hours_left=hours,
            stress_score=score
        )
        return DeadlineAnalyzeResponse(
            success=True,
            batch_id=batch_id,
            summary=f"Single task '{payload.title}' added as {props['material'].upper()} block ({props['mass']} kg).",
            total_weight_kg=props["mass"],
            stress_index=float(score),
            task_count=1,
            tasks=[task]
        )

    else:
        raise HTTPException(status_code=400, detail="Either 'raw_text' or 'title' must be provided.")

# Mount legacy endpoints if available for full backwards-compatibility
if HAS_APP_MODULE:
    @app.post("/api/parse", response_model=ParseResponse)
    def parse_tasks_legacy(payload: ParseRequest):
        if not payload.raw_text or not payload.raw_text.strip():
            raise HTTPException(status_code=400, detail="Raw text block cannot be empty")
        llm_adapter = LLMServiceAdapter()
        tasks, summary = llm_adapter.parse(payload.raw_text, force_llm=payload.use_llm)
        if not tasks:
            raise HTTPException(status_code=422, detail="No readable tasks detected in provided text")
        batch_id = str(uuid.uuid4())[:8]
        save_batch(batch_id, payload.raw_text, tasks, summary)
        return ParseResponse(success=True, batch_id=batch_id, tasks=tasks, summary=summary)

    @app.get("/api/latest")
    def get_latest():
        latest = get_latest_batch()
        if not latest:
            return {"has_data": False, "batch": None}
        summary, tasks, raw_text = latest
        return {"has_data": True, "raw_text": raw_text, "summary": summary, "tasks": tasks}

# Mount static files
if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
