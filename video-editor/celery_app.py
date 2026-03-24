import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

broker_url = os.getenv("AMQP_URL", "amqp://guest:guest@localhost:5672//")

app = Celery("video_editor", broker=broker_url)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,   
    task_track_started=True,
)

app.conf.imports = ["tasks.create_video"]
