
import pytest
from utils.scene_changes_detector import get_changes_timecodes
from utils.video_editing_utils import split_video

@pytest.mark.parametrize("test_file_path, expected_scene_count", [
    ("/Users/alexeykiselev/AiMachineTesting/Test/test_scene_changes.mp4", 14),
    ("/Users/alexeykiselev/AiMachineTesting/Test/test_scene_changes_2.mp4", 19),
    ("/Users/alexeykiselev/AiMachineTesting/Test/test_scene_changes_3.mp4", 0),
    ("/Users/alexeykiselev/AiMachineTesting/Test/test_scene_changes_4.mp4", 34),
    ("/Users/alexeykiselev/AiMachineTesting/Test/test_scene_changes_5.mp4", 11),
    ("/Users/alexeykiselev/AiMachineTesting/Test/test_scene_changes_6.mp4", 9),
    ("/Users/alexeykiselev/AiMachineTesting/Test/test_scene_changes_7.mp4", 11),
    ("/Users/alexeykiselev/AiMachineTesting/Test/test_scene_changes_8.mp4", 14),
])
def test_scene_changes_detector_parametrized(test_file_path, expected_scene_count):
    timestamps = get_changes_timecodes(test_file_path)
    assert len(timestamps) == expected_scene_count

def test_split():
    test_file_path = "/Users/alexeykiselev/AiMachineTesting/Test/test_scene_changes_8.mp4"
    split_video(test_file_path, "/Users/alexeykiselev/AiMachineTesting/Test/test_scene_changes")
