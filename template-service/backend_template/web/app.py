import asyncio
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI

from backend_template.services.job_consumer import consume_job_events
from backend_template.web.filters.endpoint_filter import EndpointFilter
from backend_template.web.routes.http.v1 import project_template, engine, library_template, ambassador, manual_review, brand, product
from backend_template.web.routes.http.v2 import template as v2_template
from backend_template.web.routes.http.internal import library_template as internal_library_template


@asynccontextmanager
async def lifespan(app: FastAPI):
    consumer_task = asyncio.create_task(consume_job_events())
    yield
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass



logging.getLogger("uvicorn.access").addFilter(EndpointFilter())

app = FastAPI(title="Template Service", lifespan=lifespan)

app.include_router(project_template.router, prefix="/v1")
app.include_router(engine.router, prefix="/v1")
app.include_router(library_template.router, prefix="/v1")
app.include_router(ambassador.router, prefix="/v1")
app.include_router(manual_review.router, prefix="/v1")
app.include_router(brand.router, prefix="/v1")
app.include_router(product.router, prefix="/v1")
app.include_router(v2_template.router, prefix="/v2")
app.include_router(internal_library_template.router, prefix="/internal")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "template-service"}
