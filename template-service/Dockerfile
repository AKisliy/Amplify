FROM python:3.11-slim

USER root
WORKDIR /app

# 1. Install system deps (curl is required to download poetry)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# 2. Configure Poetry Environment
# POETRY_HOME: Where to install poetry (isolated)
# POETRY_VIRTUALENVS_CREATE=false: Install libs globally in container (no .venv)
ENV POETRY_VERSION=2.2.1 \
    POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_CREATE=false

# 3. Install Poetry (The Official Isolated Way)
# We pipe the script to python3 to execute it
RUN curl -sSL https://install.python-poetry.org | python3 -

# 4. Add Poetry to PATH so we can run 'poetry' commands
ENV PATH="$POETRY_HOME/bin:$PATH"

# --- COPY EVERYTHING AT ONCE (Standard Strategy) ---
COPY . .

# 5. Install Dependencies
# --no-root: specific to project structure, often needed in docker
RUN poetry install --no-interaction --no-ansi --no-root

# Make script executable
RUN chmod +x scripts/entrypoint.sh

# Start
ENTRYPOINT ["./scripts/entrypoint.sh"]
CMD ["uvicorn", "backend_template.web.app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]