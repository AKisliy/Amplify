from unittest.mock import MagicMock, patch

from utils.editing_workspace import EditingWorkspace


@patch("editors.buidlers.luxury_edit_builder.LuxuryEditCommandBuilder")
@patch("utils.editing_workspace.WorkSpaceManager")
@patch("utils.ffmpeg_utils.FFmpegCommandExecutor")
def test_edit_video(mockCommandBuilder, mockWorkspaceManager, mockCommandExecutor):
    pass


