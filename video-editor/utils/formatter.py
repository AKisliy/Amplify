from moviepy import VideoFileClip


def format_clip(clip: VideoFileClip, target_resolution, target_fps) -> VideoFileClip:
    resized = clip.resized(height=target_resolution[1])
    if not isinstance(resized, VideoFileClip):
        raise Exception("resized returned unexpected type")
    if resized.size[0] > target_resolution[0]:
        resized = resized.cropped(x_center=int(resized.size[0]/2), width=target_resolution[0])
    elif resized.size[0] < target_resolution[0]:
        resized = resized.with_background_color(size=target_resolution, color=(0, 0, 0), pos='center')
    resized = resized.with_fps(target_fps)
    return resized