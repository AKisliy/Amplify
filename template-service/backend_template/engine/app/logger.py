import logging
import sys

_initialized = False

def setup_logger(log_level='INFO'):
    global _initialized
    if _initialized:
        return
    _initialized = True

    logger = logging.getLogger()
    logger.setLevel(log_level)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
