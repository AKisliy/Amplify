import logging
import os
import cv2
from PIL import Image
import imagehash
import numpy as np
import psycopg2

from models.similar_video import SimilarVideo

DB_CONFIG = {
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT")
}

def init_db():
    conn = psycopg2.connect(**DB_CONFIG)
    return conn


def extract_frames(video_path, frame_interval=30):
    cap = cv2.VideoCapture(video_path)
    frames = []
    frame_numbers = []
    count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if count % frame_interval == 0:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(Image.fromarray(frame_rgb))
            frame_numbers.append(count)
        count += 1
    cap.release()
    return frames, frame_numbers

def compare_videos(hashes1, hashes2):
    min_frames = min(len(hashes1), len(hashes2))
    if min_frames == 0:
        return 0.0
    distances = []
    for i in range(min_frames):
        hash1 = imagehash.hex_to_hash(hashes1[i][1])
        hash2 = imagehash.hex_to_hash(hashes2[i][1])
        distance = hash1 - hash2
        distances.append(distance)
    avg_distance = np.mean(distances)
    similarity = 1 - avg_distance / 64
    return similarity

def store_hashes(video_path, frames, frame_numbers, conn):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM video_frame_hashes WHERE file_id = %s", (video_path,))
    for frame, frame_num in zip(frames, frame_numbers):
        hash_value = str(imagehash.average_hash(frame))
        cursor.execute(
            "INSERT INTO video_hashes (video_path, frame_number, hash) VALUES (%s, %s, %s)",
            (video_path, frame_num, hash_value)
        )
    conn.commit()

def get_hashes(file_id, conn):
    cursor = conn.cursor()
    cursor.execute(
        "SELECT frame_number, hash FROM video_frame_hashes WHERE file_id = %s ORDER BY frame_number",
        (file_id,)
    )
    return cursor.fetchall()

def get_all_video_files(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT file_id FROM video_frame_hashes")
    return [row[0] for row in cursor.fetchall()]

def find_similar_video(video_path, similarity_threshold=0.96) -> SimilarVideo:
    conn = init_db()
    frames, frame_numbers = extract_frames(video_path)
    if not frames:
        logging.warning("Video at path {video_path} has no frames", video_path)
        raise Exception("Video has no frames")
    
    file_ids = get_all_video_files(conn)

    hashes = [str(imagehash.average_hash(frame)) for frame in frames]

    new_hashes = [(frame_num, str(imagehash.average_hash(frame))) for frame, frame_num in zip(frames, frame_numbers)]
    
    for existing_file_id in file_ids:
        existing_hashes = get_hashes(existing_file_id, conn)
        similarity = compare_videos(new_hashes, existing_hashes)
        if similarity > similarity_threshold:
            logging.warning(f"Видео {video_path} слишком похоже на {existing_file_id} (схожесть: {similarity:.2%})")
            return SimilarVideo(
                file_id=existing_file_id,
                frame_numbers=frame_numbers,
                hashes=hashes
            )   
    
    return SimilarVideo(
        file_id=None,
        frame_numbers=frame_numbers,
        hashes=hashes
    ) 

