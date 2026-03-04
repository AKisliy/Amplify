
from typing import Callable, Optional


def first_real_override(cls: type, name: str, *, base: type=None) -> Optional[Callable]:
    """Return the *callable* override of `name` visible on `cls`, or None if every
    implementation up to (and including) `base` is the placeholder defined on `base`.

    If base is not provided, it will assume cls has a GET_BASE_CLASS
    """
    if base is None:
        if not hasattr(cls, "GET_BASE_CLASS"):
            raise ValueError("base is required if cls does not have a GET_BASE_CLASS; is this a valid ComfyNode subclass?")
        base = cls.GET_BASE_CLASS()
    base_attr = getattr(base, name, None)
    if base_attr is None:
        return None
    base_func = base_attr.__func__
    for c in cls.mro():                       # NodeB, NodeA, ComfyNode, object …
        if c is base:                         # reached the placeholder – we're done
            break
        if name in c.__dict__:                # first class that *defines* the attr
            func = getattr(c, name).__func__
            if func is not base_func:         # real override
                return getattr(cls, name)     # bound to *cls*
    return None

class _NodeOutputInternal:
    """Class that all V3-based APIs inherit from for NodeOutput.

    This is intended to only be referenced within execution.py, as it has to handle all V3 APIs going forward."""
    ...

def prune_dict(d: dict):
    return {k: v for k,v in d.items() if v is not None}

def is_class(obj):
    '''
    Returns True if is a class type.
    Returns False if is a class instance.
    '''
    return isinstance(obj, type)

def copy_class(cls: type) -> type:
    '''
    Copy a class and its attributes.
    '''
    if cls is None:
        return None
    cls_dict = {
            k: v for k, v in cls.__dict__.items()
            if k not in ('__dict__', '__weakref__', '__module__', '__doc__')
        }
    # new class
    new_cls = type(
        cls.__name__,
        (cls,),
        cls_dict
    )
    # metadata preservation
    new_cls.__module__ = cls.__module__
    new_cls.__doc__ = cls.__doc__
    return new_cls

class classproperty(object):
    def __init__(self, f):
        self.f = f
    def __get__(self, obj, owner):
        return self.f(owner)

# NOTE: this was ai generated and validated by hand
def shallow_clone_class(cls, new_name=None):
    '''
    Shallow clone a class while preserving super() functionality.
    '''
    new_name = new_name or f"{cls.__name__}Clone"
    # Include the original class in the bases to maintain proper inheritance
    new_bases = (cls,) + cls.__bases__
    return type(new_name, new_bases, dict(cls.__dict__))

class ExecutionBlocker:
    """
    Return this from a node and any users will be blocked with the given error message.
    If the message is None, execution will be blocked silently instead.
    Generally, you should avoid using this functionality unless absolutely necessary. Whenever it's
    possible, a lazy input will be more efficient and have a better user experience.
    This functionality is useful in two cases:
    1. You want to conditionally prevent an output node from executing. (Particularly a built-in node
       like SaveImage. For your own output nodes, I would recommend just adding a BOOL input and using
       lazy evaluation to let it conditionally disable itself.)
    2. You have a node with multiple possible outputs, some of which are invalid and should not be used.
       (I would recommend not making nodes like this in the future -- instead, make multiple nodes with
       different outputs. Unfortunately, there are several popular existing nodes using this pattern.)
    """
    def __init__(self, message):
        self.message = message
