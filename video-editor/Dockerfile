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

# Install custom fonts so libass (fontconfig provider) can find them by name
RUN mkdir -p /usr/share/fonts/truetype/custom \
    && cp fonts/*.ttf /usr/share/fonts/truetype/custom/ \
    && fc-cache -f

CMD ["python", "main.py"]