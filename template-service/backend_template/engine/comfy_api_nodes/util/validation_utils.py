from typing import Optional

def validate_string(
    value: str,
    strip_whitespace: bool = True,
    field_name: str = "prompt",
    min_length: Optional[int] = None,
    max_length: Optional[int] = None,
) -> str:
    """
    Validates a string against length constraints and optionally strips whitespace.

    Returns:
        str: The validated and potentially stripped string.
    
    Raises:
        ValueError: If the string is None or violates length constraints.
    """
    if value is None:
        raise ValueError(f"Field '{field_name}' cannot be None.")

    if strip_whitespace:
        value = value.strip()

    # Check if the string is empty after stripping (if that is a requirement)
    # or strictly follow min_length logic.
    
    if min_length is not None and len(value) < min_length:
        raise ValueError(
            f"Field '{field_name}' cannot be shorter than {min_length} characters; "
            f"was {len(value)} characters long."
        )

    if max_length is not None and len(value) > max_length:
        raise ValueError(
            f"Field '{field_name}' cannot be longer than {max_length} characters; "
            f"was {len(value)} characters long."
        )

    return value
