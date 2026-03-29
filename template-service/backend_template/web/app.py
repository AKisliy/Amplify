from fastapi import FastAPI
from backend_template.web.routes.http.v1 import project_template, engine, library_template
from backend_template.web.routes.http.internal import library_template as internal_library_template

app = FastAPI(title="Template Service")

app.include_router(project_template.router, prefix="/v1")
app.include_router(engine.router, prefix="/v1")
app.include_router(library_template.router, prefix="/v1")
app.include_router(internal_library_template.router, prefix="/internal")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "template-service"}