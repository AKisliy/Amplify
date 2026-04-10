import os
from celery import Celery
from dotenv import load_dotenv
from sqlalchemy.pool import NullPool

load_dotenv()

broker_url = os.getenv("AMQP_URL", "amqp://guest:guest@localhost:5672//")
result_backend = os.getenv("CELERY_RESULT_BACKEND", "db+postgresql+psycopg2://dev_user:dev_password@localhost:6432/myDb")

app = Celery("video_editor", broker=broker_url, backend=result_backend)

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
