import os
from celery import Celery
from celery.signals import worker_process_init
from dotenv import load_dotenv
from sqlalchemy.pool import NullPool
from opentelemetry import trace
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.sdk._logs import LoggerProvider
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor

load_dotenv()

broker_url = os.getenv("AMQP_URL", "amqp://guest:guest@localhost:5672//")
result_backend = os.getenv("CELERY_RESULT_BACKEND", "db+postgresql+psycopg2://dev_user:dev_password@localhost:6432/myDb")

app = Celery("video_editor", broker=broker_url, backend=result_backend)


@worker_process_init.connect(weak=False)
def init_otel_in_worker(*args, **kwargs):
    """Re-initialize OTEL providers in each forked worker process.

    The k8s auto-instrumentation operator initializes OTEL in the parent process.
    After prefork, HTTP exporter connections are broken in children — recreate them here.
    CeleryInstrumentor is NOT called again: signal patches are inherited via fork.
    """
    resource = Resource.create()  # reads OTEL_SERVICE_NAME, OTEL_RESOURCE_ATTRIBUTES from env

    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(tracer_provider)

    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(BatchLogRecordProcessor(OTLPLogExporter()))
    set_logger_provider(logger_provider)


app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_track_started=True,
)

if result_backend:
    app.conf.update(
        database_table_schemas={
            "task": "video_editor",
            "group": "video_editor",
        },
        database_engine_options={"poolclass": NullPool},
    )

app.conf.imports = ["tasks.create_video", "tasks.process_media"]
