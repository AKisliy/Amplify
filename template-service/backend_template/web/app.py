import asyncio
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI

from backend_template.services.job_consumer import consume_job_events
from backend_template.web.filters.endpoint_filter import EndpointFilter
from backend_template.web.routes.http.v1 import project_template, engine, library_template, ambassador, manual_review
from backend_template.web.routes.http.internal import library_template as internal_library_template


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(consume_job_events())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass



logging.getLogger("uvicorn.access").addFilter(EndpointFilter())

app = FastAPI(title="Template Service", lifespan=lifespan)

app.include_router(project_template.router, prefix="/v1")
app.include_router(engine.router, prefix="/v1")
app.include_router(library_template.router, prefix="/v1")
app.include_router(ambassador.router, prefix="/v1")
app.include_router(manual_review.router, prefix="/v1")
app.include_router(internal_library_template.router, prefix="/internal")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "template-service"}
