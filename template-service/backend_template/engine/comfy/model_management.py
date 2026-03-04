import threading

interrupt_processing_mutex = threading.RLock()

interrupt_processing = False

def processing_interrupted():
    global interrupt_processing
    global interrupt_processing_mutex
    with interrupt_processing_mutex:
        return interrupt_processing
    