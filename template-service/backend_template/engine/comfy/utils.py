import time

PROGRESS_BAR_ENABLED = True
def set_progress_bar_enabled(enabled):
    global PROGRESS_BAR_ENABLED
    PROGRESS_BAR_ENABLED = enabled

PROGRESS_BAR_HOOK = None
def set_progress_bar_global_hook(function):
    global PROGRESS_BAR_HOOK
    PROGRESS_BAR_HOOK = function

# Throttle settings for progress bar updates to reduce WebSocket flooding
PROGRESS_THROTTLE_MIN_INTERVAL = 0.1  # 100ms minimum between updates
PROGRESS_THROTTLE_MIN_PERCENT = 0.5   # 0.5% minimum progress change

class ProgressBar:
    def __init__(self, total, node_id=None):
        global PROGRESS_BAR_HOOK
        self.total = total
        self.current = 0
        self.hook = PROGRESS_BAR_HOOK
        self.node_id = node_id
        self._last_update_time = 0.0
        self._last_sent_value = -1

    def update_absolute(self, value, total=None, preview=None):
        if total is not None:
            self.total = total
        if value > self.total:
            value = self.total
        self.current = value
        if self.hook is not None:
            current_time = time.perf_counter()
            is_first = (self._last_sent_value < 0)
            is_final = (value >= self.total)
            has_preview = (preview is not None)

            # Always send immediately for previews, first update, or final update
            if has_preview or is_first or is_final:
                self.hook(self.current, self.total, preview, node_id=self.node_id)
                self._last_update_time = current_time
                self._last_sent_value = value
                return

            # Apply throttling for regular progress updates
            if self.total > 0:
                percent_changed = ((value - max(0, self._last_sent_value)) / self.total) * 100
            else:
                percent_changed = 100
            time_elapsed = current_time - self._last_update_time

            if time_elapsed >= PROGRESS_THROTTLE_MIN_INTERVAL and percent_changed >= PROGRESS_THROTTLE_MIN_PERCENT:
                self.hook(self.current, self.total, preview, node_id=self.node_id)
                self._last_update_time = current_time
                self._last_sent_value = value

    def update(self, value):
        self.update_absolute(self.current + value)
        