from scenedetect import detect, AdaptiveDetector
from scenedetect.scene_manager import SceneList

def get_changes_timecodes(video_path: str) -> SceneList:
    scene_list = detect(video_path, AdaptiveDetector(
        adaptive_threshold=3.1, 
        min_scene_len=3, 
        window_width=1
    ))
    return scene_list