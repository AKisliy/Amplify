FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    build-essential \
    ffmpeg \
    fontconfig

WORKDIR /app

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN cp fonts/*.ttf /usr/share/fonts/truetype/ && fc-cache -f -v

CMD ["python", "main.py"]