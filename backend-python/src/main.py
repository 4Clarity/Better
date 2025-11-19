from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .routes.ai_planning import router as ai_planning_router
from .routes.chat import router as chat_router
from .routes.knowledge import router as knowledge_router
from .routes.n8n_integration import router as n8n_integration_router

app = FastAPI(
    title="TIP AI Services",
    description="AI-powered transition planning, chat assistance, RAG knowledge base, and n8n workflow integration using PydanticAI, Ollama, and Gemini",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ai_planning_router)
app.include_router(chat_router)
app.include_router(knowledge_router)
app.include_router(n8n_integration_router)

# Legacy routes (keep for backwards compatibility)
class Item(BaseModel):
    name: str
    description: str | None = None
    price: float
    tax: float | None = None

@app.get("/")
def read_root():
    return {
        "service": "TIP AI Planning Service",
        "status": "running",
        "version": "1.0.0"
    }

@app.post("/items/")
def create_item(item: Item):
    return item