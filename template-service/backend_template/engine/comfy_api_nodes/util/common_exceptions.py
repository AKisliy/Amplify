class NetworkError(Exception):
    """Base exception for network-related errors with diagnostic information."""


class LocalNetworkError(NetworkError):
    """Exception raised when local network connectivity issues are detected."""


class ApiServerError(NetworkError):
    """Exception raised when the API server is unreachable but internet is working."""


class ProcessingInterrupted(Exception):
    """Operation was interrupted by user/runtime via processing_interrupted()."""


class RAIFilteredError(Exception):
    """
    Raised when Veo returns raiMediaFilteredCount > 0.

    RAI filtering is non-deterministic — the same prompt may pass on a subsequent
    attempt. This exception is used as the retry signal in Veo execute() methods.

    Attributes:
        reasons:  List of filter reason strings returned by the API.
        attempt:  The attempt number (1-based) that produced the block.
    """

    def __init__(self, reasons: list[str], attempt: int) -> None:
        self.reasons = reasons
        self.attempt = attempt
        reason_part = f": {reasons[0]}" if reasons else ""
        super().__init__(
            f"Content blocked by Google's Responsible AI filters{reason_part} "
            f"(attempt {attempt})"
        )


class VeoTransientError(Exception):
    """
    Raised when Veo LRO returns a retryable gRPC error inside a 200 OK response.

    These errors arrive in poll_response.error and are NOT caught by sync_op's
    HTTP-level retry logic. Only codes in RETRYABLE_CODES trigger retry —
    all other LRO errors are raised as plain Exception immediately.

    Retryable gRPC codes (mapped from Google's retryable HTTP codes):
         4 — DEADLINE_EXCEEDED: operation timed out (HTTP 408 / 504).
         8 — RESOURCE_EXHAUSTED: quota or rate limit hit (HTTP 429).
        14 — UNAVAILABLE: service overloaded or in a rolling restart (HTTP 502/503).

    Not retryable:
        13 — INTERNAL: server-side bug; retrying is unlikely to help (HTTP 500).

    Attributes:
        message:  Error message from the API.
        code:     gRPC status code integer.
    """

    RETRYABLE_CODES: frozenset[int] = frozenset({4, 8, 14})

    def __init__(self, message: str, code: int) -> None:
        self.message = message
        self.code = code
        super().__init__(f"Veo transient error (gRPC code {code}): {message}")
