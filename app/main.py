import uuid
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import ParseRequest, ParseResponse
from app.parser import parse_raw_text
from app.storage import init_db, save_batch, get_latest_batch
from app.llm_adapter import LLMServiceAdapter

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database on startup
    init_db()
    os.makedirs(STATIC_DIR, exist_ok=True)
    yield

app = FastAPI(
    title="Deadline Heavyweight",
    description="Physical 3D Workload & Stress Visualizer",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

llm_adapter = LLMServiceAdapter()

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Deadline Heavyweight", "llm_ready": llm_adapter.is_configured()}

@app.post("/api/parse", response_model=ParseResponse)
def parse_tasks(payload: ParseRequest):
    if not payload.raw_text or not payload.raw_text.strip():
        raise HTTPException(status_code=400, detail="Raw text block cannot be empty")
        
    tasks, summary = llm_adapter.parse(payload.raw_text, force_llm=payload.use_llm)
    
    if not tasks:
        raise HTTPException(status_code=422, detail="No readable tasks detected in provided text")
        
    batch_id = str(uuid.uuid4())[:8]
    save_batch(batch_id, payload.raw_text, tasks, summary)
    
    return ParseResponse(
        success=True,
        batch_id=batch_id,
        tasks=tasks,
        summary=summary
    )

@app.get("/api/latest")
def get_latest():
    latest = get_latest_batch()
    if not latest:
        return {"has_data": False, "batch": None}
    summary, tasks, raw_text = latest
    return {
        "has_data": True,
        "raw_text": raw_text,
        "summary": summary,
        "tasks": tasks
    }

# Mount static files (will serve index.html, css, js)
if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
