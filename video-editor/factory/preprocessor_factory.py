
from models.enum.file_type import FileType
from preprocessors.base_preprocessor import BasePreprocessor
from preprocessors.luxury_fragment_preprocessor import LuxuryFragmentPreprocessor
from preprocessors.luxury_reference_preprocessor import LuxuryReferencePreprocessor


class PreprocessorFactory():
    def get_preprocessor(self, file_type: FileType) -> BasePreprocessor:
        if file_type == FileType.LuxuryReference:
            return LuxuryReferencePreprocessor()
        if file_type == FileType.LuxuryFragment:
            return LuxuryFragmentPreprocessor()
        else:
            raise Exception("No preprocessors found for type {file_type}", file_type)