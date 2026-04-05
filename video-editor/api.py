from fastapi import FastAPI
from celery.result import AsyncResult

from celery_app import app as celery_app
from models.messages.base_create_video_message import BaseCreateVideoMessage

api = FastAPI()


@api.post("/tasks", status_code=202)
def submit_task(message: BaseCreateVideoMessage):
    task = celery_app.send_task("tasks.create_video", args=[message.model_dump()])
    return {"task_id": task.id}


@api.get("/tasks/{task_id}")
def get_task_status(task_id: str):
    result = AsyncResult(task_id, app=celery_app)
    response = {"task_id": task_id, "status": result.state}

    if result.state == "SUCCESS":
        response["result"] = result.result
    elif result.state == "FAILURE":
        response["error"] = str(result.result)

    return response
