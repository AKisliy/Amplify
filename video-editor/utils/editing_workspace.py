import logging
import os
from typing import List
from uuid import uuid4

class WorkspaceManager:
    def create_workspace(self, base_path: str):
        return EditingWorkspace(base_path)


class EditingWorkspace:
    """Управляет временными файлами и директориями для одного сеанса редактирования."""
    def __init__(self, base_path: str):
        self.editing_uid = uuid4()

        self.base_path = base_path
        if not os.path.exists(self.base_path):
            os.makedirs(self.base_path)
        
        self._temp_files = []

    def get_temp_path(self, extension: str) -> str:
        """Создает уникальный путь для временного файла и запоминает его."""
        path = os.path.join(self.base_path, f"{self.editing_uid}_{len(self._temp_files)}.{extension}")
        self._temp_files.append(path)
        return path

    def create_concat_file(self, file_paths: List[str]) -> str:
        """Создает текстовый файл для конкатенации ffmpeg."""
        concat_file_path = self.get_temp_path('txt')
        with open(concat_file_path, "w") as f:
            for path in file_paths:
                f.write(f"file '{os.path.abspath(path)}'\n")
        return concat_file_path

    def cleanup(self):
        """Удаляет все временные файлы, созданные в этом рабочем пространстве."""
        for path in self._temp_files:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except OSError as e:
                logging.error(f"Error cleaning up file {path}: {e}")