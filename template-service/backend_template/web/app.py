from fastapi import FastAPI
from backend_template.config import settings
from backend_template.web.routes.http.v1 import project_template

app = FastAPI(title="Template Service", root_path=settings.root_path)

app.include_router(project_template.router, prefix="/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "template-service"}