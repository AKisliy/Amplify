import json
from pathlib import Path

ROOT_PATH = "/template"

def main() -> None:
    from backend_template.web.app import app

    spec = app.openapi()
    spec["servers"] = [{"url": ROOT_PATH}]

    repo_root = Path(__file__).parents[2]
    output = repo_root / "api-specs" / "template-service.json"
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(spec, indent=2))
    print(f"Spec exported to {output}")