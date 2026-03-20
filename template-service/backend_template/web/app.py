from fastapi import FastAPI
from backend_template.web.routes.http.v1 import project_template, engine

app = FastAPI(title="Template Service")

app.include_router(project_template.router, prefix="/v1")
app.include_router(engine.router, prefix="/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "template-service"}