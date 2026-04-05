from __future__ import annotations
import copy
import inspect
from abc import ABC, abstractmethod
from collections import Counter
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, TypeVar, TypedDict, Literal, Callable
from typing_extensions import final

from comfy_api.internal import (copy_class, prune_dict, _NodeOutputInternal, is_class, shallow_clone_class, first_real_override, classproperty, _ComfyNodeInternal)
from comfy_execution.graph_utils import ExecutionBlocker


class RemoteOptions:
    def __init__(self, route: str, refresh_button: bool, control_after_refresh: Literal["first", "last"]="first",
                 timeout: int=None, max_retries: int=None, refresh: int=None):
        self.route = route
        """The route to the remote source."""
        self.refresh_button = refresh_button
        """Specifies whether to show a refresh button in the UI below the widget."""
        self.control_after_refresh = control_after_refresh
        """Specifies the control after the refresh button is clicked. If "first", the first item will be automatically selected, and so on."""
        self.timeout = timeout
        """The maximum amount of time to wait for a response from the remote source in milliseconds."""
        self.max_retries = max_retries
        """The maximum number of retries before aborting the request."""
        self.refresh = refresh
        """The TTL of the remote input's value in milliseconds. Specifies the interval at which the remote input's value is refreshed."""

    def as_dict(self):
        return prune_dict({
            "route": self.route,
            "refresh_button": self.refresh_button,
            "control_after_refresh": self.control_after_refresh,
            "timeout": self.timeout,
            "max_retries": self.max_retries,
            "refresh": self.refresh,
        })
        
class NumberDisplay(str, Enum):
    number = "number"
    slider = "slider"        

class _ComfyType(ABC):
    Type = Any
    io_type: str = None 

# NOTE: this is a workaround to make the decorator return the correct type
T = TypeVar("T", bound=type)
def comfytype(io_type: str, **kwargs):
    '''
    Decorator to mark nested classes as ComfyType; io_type will be bound to the class.

    A ComfyType may have the following attributes:
    - Type = <type hint here>
    - class Input(Input): ...
    - class Output(Output): ...
    '''
    def decorator(cls: T) -> T:
        if isinstance(cls, _ComfyType) or issubclass(cls, _ComfyType):
            # clone Input and Output classes to avoid modifying the original class
            new_cls = cls
            if hasattr(new_cls, "Input"):
                new_cls.Input = copy_class(new_cls.Input)
            if hasattr(new_cls, "Output"):
                new_cls.Output = copy_class(new_cls.Output)
        else:
            # copy class attributes except for special ones that shouldn't be in type()
            cls_dict = {
                k: v for k, v in cls.__dict__.items()
                if k not in ('__dict__', '__weakref__', '__module__', '__doc__')
            }
            # new class
            new_cls: ComfyTypeIO = type(
                cls.__name__,
                (cls, ComfyTypeIO),
                cls_dict
            )
            # metadata preservation
            new_cls.__module__ = cls.__module__
            new_cls.__doc__ = cls.__doc__
            # assign ComfyType attributes, if needed
        new_cls.io_type = io_type
        if hasattr(new_cls, "Input") and new_cls.Input is not None:
            new_cls.Input.Parent = new_cls
        if hasattr(new_cls, "Output") and new_cls.Output is not None:
            new_cls.Output.Parent = new_cls
        return new_cls
    return decorator

class _IO_V3:
    '''
    Base class for V3 Inputs and Outputs.
    '''
    Parent: _ComfyType = None

    def __init__(self):
        pass

    def validate(self):
        pass

    @property
    def io_type(self):
        return self.Parent.io_type

    @property
    def Type(self):
        return self.Parent.Type

class Input(_IO_V3):
    '''
    Base class for a V3 Input.
    '''
    def __init__(self, id: str, display_name: str=None, optional=False, tooltip: str=None, lazy: bool=None, extra_dict=None, raw_link: bool=None, advanced: bool=None):
        super().__init__()
        self.id = id
        self.display_name = display_name
        self.optional = optional
        self.tooltip = tooltip
        self.extra_dict = extra_dict if extra_dict is not None else {}
        self.advanced = advanced

    def as_dict(self):
        display_name = self.display_name if self.display_name else self.id
        return prune_dict({
            "display_name": display_name,
            "optional": self.optional,
            "tooltip": self.tooltip,
            "advanced": self.advanced,
        }) | prune_dict(self.extra_dict)

    def get_io_type(self):
        return self.io_type

    def get_all(self) -> list[Input]:
        return [self]

class WidgetInput(Input):
    '''
    Base class for a V3 Input with widget.
    '''
    def __init__(self, id: str, display_name: str=None, optional=False, tooltip: str=None, lazy: bool=None,
                 default: Any=None, socketless: bool=None, widget_type: str=None, force_input: bool=None,
                 extra_dict=None, raw_link: bool=None, advanced: bool=None):
        super().__init__(id, display_name, optional, tooltip, lazy, extra_dict, raw_link, advanced)
        self.default = default
        self.socketless = socketless
        self.widget_type = widget_type
        self.force_input = force_input

    def as_dict(self):
        return super().as_dict() | prune_dict({
            "default": self.default,
            "socketless": self.socketless,
            "widgetType": self.widget_type,
            "forceInput": self.force_input,
        })

    def get_io_type(self):
        return self.widget_type if self.widget_type is not None else super().get_io_type()


class Output(_IO_V3):
    def __init__(self, id: str=None, display_name: str=None, tooltip: str=None, is_output_list: bool=False):
        self.id = id
        self.display_name = display_name if display_name else id
        self.tooltip = tooltip
        self.is_output_list = is_output_list

    def as_dict(self):
        display_name = self.display_name if self.display_name else self.id
        return prune_dict({
            "display_name": display_name,
            "tooltip": self.tooltip,
            "is_output_list": self.is_output_list,
        })

    def get_io_type(self):
        return self.io_type


class ComfyTypeI(_ComfyType):
    '''ComfyType subclass that only has a default Input class - intended for types that only have Inputs.'''
    class Input(Input):
        ...

class ComfyTypeIO(ComfyTypeI):
    '''ComfyType subclass that has default Input and Output classes; useful for types with both Inputs and Outputs.'''
    class Output(Output):
        ...
        
@comfytype(io_type="BOOLEAN")
class Boolean(ComfyTypeIO):
    Type = bool

    class Input(WidgetInput):
        '''Boolean input.'''
        def __init__(self, id: str, display_name: str=None, optional=False, tooltip: str=None, default: bool=None, label_on: str=None, label_off: str=None,
                    socketless: bool=None, force_input: bool=None, extra_dict=None, advanced: bool=None):
            super().__init__(id, display_name, optional, tooltip, None, default, socketless, None, force_input, extra_dict, None, advanced)
            self.label_on = label_on
            self.label_off = label_off
            self.default: bool

        def as_dict(self):
            return super().as_dict() | prune_dict({
                "label_on": self.label_on,
                "label_off": self.label_off,
            })

@comfytype(io_type="INT")
class Int(ComfyTypeIO):
    Type = int

    class Input(WidgetInput):
        '''Integer input.'''
        def __init__(self, id: str, display_name: str=None, optional=False, tooltip: str=None,
                    default: int=None, min: int=None, max: int=None, step: int=None, control_after_generate: bool=None,
                    display_mode: NumberDisplay=None, socketless: bool=None, force_input: bool=None, extra_dict=None, advanced: bool=None):
            super().__init__(id, display_name, optional, tooltip, None, default, socketless, None, force_input, extra_dict, None, advanced)
            self.min = min
            self.max = max
            self.step = step
            self.control_after_generate = control_after_generate
            self.display_mode = display_mode
            self.default: int

        def as_dict(self):
            return super().as_dict() | prune_dict({
                "min": self.min,
                "max": self.max,
                "step": self.step,
                "control_after_generate": self.control_after_generate,
                "display": self.display_mode.value if self.display_mode else None,
            })

@comfytype(io_type="FLOAT")
class Float(ComfyTypeIO):
    Type = float

    class Input(WidgetInput):
        '''Float input.'''
        def __init__(self, id: str, display_name: str=None, optional=False, tooltip: str=None, lazy: bool=None,
                    default: float=None, min: float=None, max: float=None, step: float=None, round: float=None,
                    display_mode: NumberDisplay=None, socketless: bool=None, force_input: bool=None, extra_dict=None, raw_link: bool=None, advanced: bool=None):
            super().__init__(id, display_name, optional, tooltip, lazy, default, socketless, None, force_input, extra_dict, raw_link, advanced)
            self.min = min
            self.max = max
            self.step = step
            self.round = round
            self.display_mode = display_mode
            self.default: float

        def as_dict(self):
            return super().as_dict() | prune_dict({
                "min": self.min,
                "max": self.max,
                "step": self.step,
                "round": self.round,
                "display": self.display_mode,
            })

@comfytype(io_type="STRING")
class String(ComfyTypeIO):
    Type = str

    class Input(WidgetInput):
        '''String input.'''
        def __init__(self, id: str, display_name: str=None, optional=False, tooltip: str=None,
                    multiline=False, placeholder: str=None, default: str=None, dynamic_prompts: bool=None,
                    socketless: bool=None, force_input: bool=None, extra_dict=None, advanced: bool=None):
            super().__init__(id, display_name, optional, tooltip, None, default, socketless, None, force_input, extra_dict, None, advanced)
            self.multiline = multiline
            self.placeholder = placeholder
            self.dynamic_prompts = dynamic_prompts
            self.default: str

        def as_dict(self):
            return super().as_dict() | prune_dict({
                "multiline": self.multiline,
                "placeholder": self.placeholder,
                "dynamicPrompts": self.dynamic_prompts,
            })

@comfytype(io_type="COMBO")
class Combo(ComfyTypeIO):
    Type = str
    class Input(WidgetInput):
        """Combo input (dropdown)."""
        Type = str
        def __init__(
            self,
            id: str,
            options: list[str] | list[int] | type[Enum] = None,
            display_name: str=None,
            optional=False,
            tooltip: str=None,
            default: str | int | Enum = None,
            remote: RemoteOptions=None,
            socketless: bool=None,
            extra_dict=None,
            advanced: bool=None,
        ):
            if isinstance(options, type) and issubclass(options, Enum):
                options = [v.value for v in options]
            if isinstance(default, Enum):
                default = default.value
            super().__init__(id, display_name, optional, tooltip, None, default, socketless, None, None, extra_dict, None, advanced)
            self.multiselect = False
            self.options = options
            self.remote = remote
            self.default: str

        def as_dict(self):
            return super().as_dict() | prune_dict({
                "multiselect": self.multiselect,
                "options": self.options,
                "remote": self.remote.as_dict() if self.remote else None,
            })

    class Output(Output):
        def __init__(self, id: str=None, display_name: str=None, options: list[str]=None, tooltip: str=None):
            super().__init__(id, display_name, tooltip)
            self.options = options if options is not None else []

@comfytype(io_type="IMAGE")
class Image(ComfyTypeIO):
    Type = str

class DynamicInput(Input, ABC):
    '''
    Abstract class for dynamic input registration.
    '''
    pass


class DynamicOutput(Output, ABC):
    '''
    Abstract class for dynamic output registration.
    '''
    pass

def handle_prefix(prefix_list: list[str] | None, id: str | None = None) -> list[str]:
    if prefix_list is None:
        prefix_list = []
    if id is not None:
        prefix_list = prefix_list + [id]
    return prefix_list

def finalize_prefix(prefix_list: list[str] | None, id: str | None = None) -> str:
    assert not (prefix_list is None and id is None)
    if prefix_list is None:
        return id
    elif id is not None:
        prefix_list = prefix_list + [id]
    return ".".join(prefix_list)

@comfytype(io_type="COMFY_AUTOGROW_V3")
class Autogrow(ComfyTypeI):
    Type = dict[str, Any]
    _MaxNames = 100  # NOTE: max 100 names for sanity

    class _AutogrowTemplate:
        def __init__(self, input: Input):
            # dynamic inputs are not allowed as the template input
            assert(not isinstance(input, DynamicInput))
            self.input = copy.copy(input)
            if isinstance(self.input, WidgetInput):
                self.input.force_input = True
            self.names: list[str] = []
            self.cached_inputs = {}

        def _create_input(self, input: Input, name: str):
            new_input = copy.copy(self.input)
            new_input.id = name
            return new_input

        def _create_cached_inputs(self):
            for name in self.names:
                self.cached_inputs[name] = self._create_input(self.input, name)

        def get_all(self) -> list[Input]:
            return list(self.cached_inputs.values())

        def as_dict(self):
            return prune_dict({
                "input": create_input_dict_v1([self.input]),
            })

        def validate(self):
            self.input.validate()

    class TemplatePrefix(_AutogrowTemplate):
        def __init__(self, input: Input, prefix: str, min: int=1, max: int=10):
            super().__init__(input)
            self.prefix = prefix
            assert(min >= 0)
            assert(max >= 1)
            assert(max <= Autogrow._MaxNames)
            self.min = min
            self.max = max
            self.names = [f"{self.prefix}{i}" for i in range(self.max)]
            self._create_cached_inputs()

        def as_dict(self):
            return super().as_dict() | prune_dict({
                "prefix": self.prefix,
                "min": self.min,
                "max": self.max,
            })

    class TemplateNames(_AutogrowTemplate):
        def __init__(self, input: Input, names: list[str], min: int=1):
            super().__init__(input)
            self.names = names[:Autogrow._MaxNames]
            assert(min >= 0)
            self.min = min
            self._create_cached_inputs()

        def as_dict(self):
            return super().as_dict() | prune_dict({
                "names": self.names,
                "min": self.min,
            })

    class Input(DynamicInput):
        def __init__(self, id: str, template: Autogrow.TemplatePrefix | Autogrow.TemplateNames,
                     display_name: str=None, optional=False, tooltip: str=None, lazy: bool=None, extra_dict=None):
            super().__init__(id, display_name, optional, tooltip, lazy, extra_dict)
            self.template = template

        def as_dict(self):
            return super().as_dict() | prune_dict({
                "template": self.template.as_dict(),
            })

        def get_all(self) -> list[Input]:
            return [self] + self.template.get_all()

        def validate(self):
            self.template.validate()

    @staticmethod
    def _expand_schema_for_dynamic(out_dict: dict[str, Any], live_inputs: dict[str, Any], value: tuple[str, dict[str, Any]], input_type: str, curr_prefix: list[str] | None):
        # NOTE: purposely do not include self in out_dict; instead use only the template inputs
        # need to figure out names based on template type
        is_names = ("names" in value[1]["template"])
        is_prefix = ("prefix" in value[1]["template"])
        input = value[1]["template"]["input"]
        if is_names:
            min = value[1]["template"]["min"]
            names = value[1]["template"]["names"]
            max = len(names)
        elif is_prefix:
            prefix = value[1]["template"]["prefix"]
            min = value[1]["template"]["min"]
            max = value[1]["template"]["max"]
            names = [f"{prefix}{i}" for i in range(max)]
        # need to create a new input based on the contents of input
        template_input = None
        template_required = True
        for _input_type, dict_input in input.items():
            # for now, get just the first value from dict_input; if not required, min can be ignored
            if len(dict_input) == 0:
                continue
            template_input = list(dict_input.values())[0]
            template_required = _input_type == "required"
            break
        if template_input is None:
            raise Exception("template_input could not be determined from required or optional; this should never happen.")
        new_dict = {}
        new_dict_added_to = False
        # first, add possible inputs into out_dict
        for i, name in enumerate(names):
            expected_id = finalize_prefix(curr_prefix, name)
            # required
            if i < min and template_required:
                out_dict["required"][expected_id] = template_input
                type_dict = new_dict.setdefault("required", {})
            # optional
            else:
                out_dict["optional"][expected_id] = template_input
                type_dict = new_dict.setdefault("optional", {})
            if expected_id in live_inputs:
                # NOTE: prefix gets added in parse_class_inputs
                type_dict[name] = template_input
                new_dict_added_to = True
        # account for the edge case that all inputs are optional and no values are received
        if not new_dict_added_to:
            finalized_prefix = finalize_prefix(curr_prefix)
            out_dict["dynamic_paths"][finalized_prefix] = finalized_prefix
            out_dict["dynamic_paths_default_value"][finalized_prefix] = DynamicPathsDefaultValue.EMPTY_DICT
        parse_class_inputs(out_dict, live_inputs, new_dict, curr_prefix)

DYNAMIC_INPUT_LOOKUP: dict[str, Callable[[dict[str, Any], dict[str, Any], tuple[str, dict[str, Any]], str, list[str] | None], None]] = {}
def register_dynamic_input_func(io_type: str, func: Callable[[dict[str, Any], dict[str, Any], tuple[str, dict[str, Any]], str, list[str] | None], None]):
    DYNAMIC_INPUT_LOOKUP[io_type] = func

def get_dynamic_input_func(io_type: str) -> Callable[[dict[str, Any], dict[str, Any], tuple[str, dict[str, Any]], str, list[str] | None], None]:
    return DYNAMIC_INPUT_LOOKUP[io_type]

def setup_dynamic_input_funcs():
    # Autogrow.Input
    register_dynamic_input_func(Autogrow.io_type, Autogrow._expand_schema_for_dynamic)
    
if len(DYNAMIC_INPUT_LOOKUP) == 0:
    setup_dynamic_input_funcs()

class V3Data(TypedDict):
    hidden_inputs: dict[str, Any]
    'Dictionary where the keys are the hidden input ids and the values are the values of the hidden inputs.'
    
class HiddenHolder:
    def __init__(self, unique_id: str=None, prompt: Any=None,
                 extra_pnginfo: Any=None, dynprompt: Any=None,
                 auth_token_comfy_org: str=None, api_key_comfy_org: str=None, **kwargs):
        self.unique_id = unique_id
        """UNIQUE_ID is the unique identifier of the node, and matches the id property of the node on the client side. It is commonly used in client-server communications (see messages)."""
        self.prompt = prompt
        """PROMPT is the complete prompt sent by the client to the server. See the prompt object for a full description."""

    def __getattr__(self, key: str):
        '''If hidden variable not found, return None.'''
        return None

    @classmethod
    def from_dict(cls, d: dict | None):
        if d is None:
            d = {}
        return cls(
            unique_id=d.get(Hidden.unique_id, None),
            prompt=d.get(Hidden.prompt, None),
            extra_pnginfo=d.get(Hidden.extra_pnginfo, None),
        )

    @classmethod
    def from_v3_data(cls, v3_data: V3Data | None) -> HiddenHolder:
        return cls.from_dict(v3_data["hidden_inputs"] if v3_data else None)
    
class Hidden(str, Enum):
    '''
    Enumerator for requesting hidden variables in nodes.
    '''
    unique_id = "UNIQUE_ID"
    """UNIQUE_ID is the unique identifier of the node, and matches the id property of the node on the client side. It is commonly used in client-server communications (see messages)."""
    prompt = "PROMPT"
    extra_pnginfo = "EXTRA_PNGINFO"
    """PROMPT is the complete prompt sent by the client to the server. See the prompt object for a full description."""
    dynprompt = "DYNPROMPT"

@dataclass
class NodeInfoV1:
    input: dict=None
    input_order: dict[str, list[str]]=None
    is_input_list: bool=None
    output: list[str]=None
    output_is_list: list[bool]=None
    output_name: list[str]=None
    output_tooltips: list[str]=None
    output_matchtypes: list[str]=None
    name: str=None
    display_name: str=None
    description: str=None
    python_module: Any=None
    category: str=None
    output_node: bool=None
    deprecated: bool=None
    experimental: bool=None
    dev_only: bool=None
    api_node: bool=None
    price_badge: dict | None = None
    search_aliases: list[str]=None
    essentials_category: str=None

@dataclass
class NodeInfoV3:
    input: dict=None
    output: dict=None
    hidden: list[str]=None
    name: str=None
    display_name: str=None
    description: str=None
    category: str=None
    output_node: bool=None
    api_node: bool=None
    price_badge: dict | None = None
    
@dataclass
class PriceBadgeDepends:
    widgets: list[str] = field(default_factory=list)
    inputs: list[str] = field(default_factory=list)

    def validate(self) -> None:
        if not isinstance(self.widgets, list) or any(not isinstance(x, str) for x in self.widgets):
            raise ValueError("PriceBadgeDepends.widgets must be a list[str].")
        if not isinstance(self.inputs, list) or any(not isinstance(x, str) for x in self.inputs):
            raise ValueError("PriceBadgeDepends.inputs must be a list[str].")

    def as_dict(self, schema_inputs: list["Input"]) -> dict[str, Any]:
        # Build lookup: widget_id -> io_type
        input_types: dict[str, str] = {}
        for inp in schema_inputs:
            input_types[inp.id] = inp.get_io_type()  # First input is always the parent itself
 
        # Enrich widgets with type information, raising error for unknown widgets
        widgets_data: list[dict[str, str]] = []
        for w in self.widgets:
            if w not in input_types:
                raise ValueError(
                    f"PriceBadge depends_on.widgets references unknown widget '{w}'. "
                    f"Available widgets: {list(input_types.keys())}"
                )
            widgets_data.append({"name": w, "type": input_types[w]})

        return {
            "widgets": widgets_data,
            "inputs": self.inputs,
        }
        
@dataclass
class PriceBadge:
    expr: str
    depends_on: PriceBadgeDepends = field(default_factory=PriceBadgeDepends)
    engine: str = field(default="jsonata")

    def validate(self) -> None:
        if self.engine != "jsonata":
            raise ValueError(f"Unsupported PriceBadge.engine '{self.engine}'. Only 'jsonata' is supported.")
        if not isinstance(self.expr, str) or not self.expr.strip():
            raise ValueError("PriceBadge.expr must be a non-empty string.")
        self.depends_on.validate()

    def as_dict(self, schema_inputs: list["Input"]) -> dict[str, Any]:
        return {
            "engine": self.engine,
            "depends_on": self.depends_on.as_dict(schema_inputs),
            "expr": self.expr,
        }
        
@dataclass
class Schema:
    """Definition of V3 node properties."""

    node_id: str
    display_name: str = None
    category: str = "sd"
    inputs: list[Input] = field(default_factory=list)
    outputs: list[Output] = field(default_factory=list)
    hidden: list[Hidden] = field(default_factory=list)
    description: str=""
    search_aliases: list[str] = field(default_factory=list)
    is_input_list: bool = False
    is_output_node: bool=False
    is_deprecated: bool=False
    is_experimental: bool=False
    is_dev_only: bool=False
    is_api_node: bool=False
    price_badge: PriceBadge | None = None
    not_idempotent: bool=False
    enable_expand: bool=False
    accept_all_inputs: bool=False
    essentials_category: str | None = None

    def validate(self):
        '''Validate the schema:
        - verify ids on inputs and outputs are unique - both internally and in relation to each other
        '''
        nested_inputs: list[Input] = []
        for input in self.inputs:
            # if not isinstance(input, DynamicInput):
            #     nested_inputs.extend(input.get_all())
            nested_inputs.extend(input.get_all())
        input_ids = [i.id for i in nested_inputs]
        output_ids = [o.id for o in self.outputs]
        input_set = set(input_ids)
        output_set = set(output_ids)
        issues: list[str] = []
        # verify ids are unique per list
        if len(input_set) != len(input_ids):
            issues.append(f"Input ids must be unique, but {[item for item, count in Counter(input_ids).items() if count > 1]} are not.")
        if len(output_set) != len(output_ids):
            issues.append(f"Output ids must be unique, but {[item for item, count in Counter(output_ids).items() if count > 1]} are not.")
        if len(issues) > 0:
            raise ValueError("\n".join(issues))
        # validate inputs and outputs
        for input in self.inputs:
            input.validate()
        for output in self.outputs:
            output.validate()
        if self.price_badge is not None:
            self.price_badge.validate()

    def finalize(self):
        """Add hidden based on selected schema options, and give outputs without ids default ids."""
        # ensure inputs, outputs, and hidden are lists
        if self.inputs is None:
            self.inputs = []
        if self.outputs is None:
            self.outputs = []
        if self.hidden is None:
            self.hidden = []
        # if is an api_node, will need key-related hidden
        if self.is_api_node:
            pass
        # if is an output_node, will need prompt and extra_pnginfo
        if self.is_output_node:
            if Hidden.prompt not in self.hidden:
                self.hidden.append(Hidden.prompt)
            
        # give outputs without ids default ids
        for i, output in enumerate(self.outputs):
            if output.id is None:
                output.id = f"_{i}_{output.io_type}_"

    def get_v1_info(self, cls) -> NodeInfoV1:
        # get V1 inputs
        input = create_input_dict_v1(self.inputs)
        if self.hidden:
            for hidden in self.hidden:
                input.setdefault("hidden", {})[hidden.name] = (hidden.value,)
        # create separate lists from output fields
        output = []
        output_is_list = []
        output_name = []
        output_tooltips = []
        output_matchtypes = []
        any_matchtypes = False
        if self.outputs:
            for o in self.outputs:
                output.append(o.io_type)
                output_is_list.append(o.is_output_list)
                output_name.append(o.display_name if o.display_name else o.io_type)
                output_tooltips.append(o.tooltip if o.tooltip else None)
                # # special handling for MatchType
                # if isinstance(o, MatchType.Output):
                #     output_matchtypes.append(o.template.template_id)
                #     any_matchtypes = True
                # else:
                #     output_matchtypes.append(None)

        # clear out lists that are all None
        if not any_matchtypes:
            output_matchtypes = None

        info = NodeInfoV1(
            input=input,
            input_order={key: list(value.keys()) for (key, value) in input.items()},
            is_input_list=self.is_input_list,
            output=output,
            output_is_list=output_is_list,
            output_name=output_name,
            output_tooltips=output_tooltips,
            output_matchtypes=output_matchtypes,
            name=self.node_id,
            display_name=self.display_name,
            category=self.category,
            description=self.description,
            output_node=self.is_output_node,
            deprecated=self.is_deprecated,
            experimental=self.is_experimental,
            dev_only=self.is_dev_only,
            api_node=self.is_api_node,
            python_module=getattr(cls, "RELATIVE_PYTHON_MODULE", "nodes"),
            price_badge=self.price_badge.as_dict(self.inputs) if self.price_badge is not None else None,
            search_aliases=self.search_aliases if self.search_aliases else None,
            essentials_category=self.essentials_category,
        )
        return info

    def get_v3_info(self) -> NodeInfoV3:
        input_dict = {}
        output_dict = {}
        hidden_list = []
        # TODO: make sure dynamic types will be handled correctly
        if self.inputs:
            for input in self.inputs:
                add_to_dict_v3(input, input_dict)
        if self.outputs:
            for output in self.outputs:
                add_to_dict_v3(output, output_dict)
        if self.hidden:
            for hidden in self.hidden:
                hidden_list.append(hidden.value)

        info = NodeInfoV3(
            input=input_dict,
            output=output_dict,
            hidden=hidden_list,
            name=self.node_id,
            display_name=self.display_name,
            description=self.description,
            category=self.category,
            output_node=self.is_output_node,
            api_node=self.is_api_node,
            price_badge=self.price_badge.as_dict(self.inputs) if self.price_badge is not None else None,
        )
        return info 

def get_finalized_class_inputs(d: dict[str, Any], live_inputs: dict[str, Any], include_hidden=False) -> tuple[dict[str, Any], V3Data]:
    out_dict = {
        "required": {},
        "optional": {},
        "dynamic_paths": {},
        "dynamic_paths_default_value": {},
    }
    d = d.copy()
    # ignore hidden for parsing
    hidden = d.pop("hidden", None)
    parse_class_inputs(out_dict, live_inputs, d)
    if hidden is not None and include_hidden:
        out_dict["hidden"] = hidden
    v3_data = {}
    dynamic_paths = out_dict.pop("dynamic_paths", None)
    if dynamic_paths is not None and len(dynamic_paths) > 0:
        v3_data["dynamic_paths"] = dynamic_paths
    # this list is used for autogrow, in the case all inputs are optional and no values are passed
    dynamic_paths_default_value = out_dict.pop("dynamic_paths_default_value", None)
    if dynamic_paths_default_value is not None and len(dynamic_paths_default_value) > 0:
        v3_data["dynamic_paths_default_value"] = dynamic_paths_default_value
    return out_dict, hidden, v3_data

def parse_class_inputs(out_dict: dict[str, Any], live_inputs: dict[str, Any], curr_dict: dict[str, Any], curr_prefix: list[str] | None=None) -> None:
    for input_type, inner_d in curr_dict.items():
        for id, value in inner_d.items():
            io_type = value[0]
            if io_type in DYNAMIC_INPUT_LOOKUP:
                # dynamic inputs need to be handled with lookup functions
                dynamic_input_func = get_dynamic_input_func(io_type)
                new_prefix = handle_prefix(curr_prefix, id)
                dynamic_input_func(out_dict, live_inputs, value, input_type, new_prefix)
            else:
                # non-dynamic inputs get directly transferred
                finalized_id = finalize_prefix(curr_prefix, id)
                out_dict[input_type][finalized_id] = value
                if curr_prefix:
                    out_dict["dynamic_paths"][finalized_id] = finalized_id

def create_input_dict_v1(inputs: list[Input]) -> dict:
    input = {
        "required": {}
    }
    for i in inputs:
        add_to_dict_v1(i, input)
    return input

def add_to_dict_v1(i: Input, d: dict):
    key = "optional" if i.optional else "required"
    as_dict = i.as_dict()
    # for v1, we don't want to include the optional key
    as_dict.pop("optional", None)
    d.setdefault(key, {})[i.id] = (i.get_io_type(), as_dict)

def add_to_dict_v3(io: Input | Output, d: dict):
    d[io.id] = (io.get_io_type(), io.as_dict())           

class DynamicPathsDefaultValue:
    EMPTY_DICT = "empty_dict"

def build_nested_inputs(values: dict[str, Any], v3_data: V3Data):
    paths = v3_data.get("dynamic_paths", None)
    default_value_dict = v3_data.get("dynamic_paths_default_value", {})
    if paths is None:
        return values
    values = values.copy()

    result = {}

    create_tuple = v3_data.get("create_dynamic_tuple", False)

    for key, path in paths.items():
        parts = path.split(".")
        current = result

        for i, p in enumerate(parts):
            is_last = (i == len(parts) - 1)

            if is_last:
                value = values.pop(key, None)
                if value is None:
                    # see if a default value was provided for this key
                    default_option = default_value_dict.get(key, None)
                    if default_option == DynamicPathsDefaultValue.EMPTY_DICT:
                        value = {}
                if create_tuple:
                    value = (value, key)
                current[p] = value
            else:
                current = current.setdefault(p, {})

    values.update(result)
    return values

class _ComfyNodeBaseInternal(_ComfyNodeInternal):
    """Common base class for storing internal methods and properties; DO NOT USE for defining nodes."""

    RELATIVE_PYTHON_MODULE = None
    SCHEMA = None

    # filled in during execution
    hidden: HiddenHolder = None

    @classmethod
    @abstractmethod
    def define_schema(cls) -> Schema:
        """Override this function with one that returns a Schema instance."""
        raise NotImplementedError

    @classmethod
    @abstractmethod
    def execute(cls, **kwargs) -> NodeOutput:
        """Override this function with one that performs node's actions."""
        raise NotImplementedError

    @classmethod
    def validate_inputs(cls, **kwargs) -> bool | str:
        """Optionally, define this function to validate inputs; equivalent to V1's VALIDATE_INPUTS.

        If the function returns a string, it will be used as the validation error message for the node.
        """
        raise NotImplementedError

    def __init__(self):
        self.__class__.VALIDATE_CLASS()

    @classmethod
    def GET_BASE_CLASS(cls):
        return _ComfyNodeBaseInternal

    @final
    @classmethod
    def VALIDATE_CLASS(cls):
        if first_real_override(cls, "define_schema") is None:
            raise Exception(f"No define_schema function was defined for node class {cls.__name__}.")
        if first_real_override(cls, "execute") is None:
            raise Exception(f"No execute function was defined for node class {cls.__name__}.")

    @classproperty
    def FUNCTION(cls):  # noqa
        if inspect.iscoroutinefunction(cls.execute):
            return "EXECUTE_NORMALIZED_ASYNC"
        return "EXECUTE_NORMALIZED"

    @final
    @classmethod
    def EXECUTE_NORMALIZED(cls, *args, **kwargs) -> NodeOutput:
        to_return = cls.execute(*args, **kwargs)
        if to_return is None:
            to_return = NodeOutput()
        elif isinstance(to_return, NodeOutput):
            pass
        elif isinstance(to_return, tuple):
            to_return = NodeOutput(*to_return)
        elif isinstance(to_return, dict):
            to_return = NodeOutput.from_dict(to_return)
        elif isinstance(to_return, ExecutionBlocker):
            to_return = NodeOutput(block_execution=to_return.message)
        else:
            raise Exception(f"Invalid return type from node: {type(to_return)}")
        return to_return

    @final
    @classmethod
    async def EXECUTE_NORMALIZED_ASYNC(cls, *args, **kwargs) -> NodeOutput:
        to_return = await cls.execute(*args, **kwargs)
        if to_return is None:
            to_return = NodeOutput()
        elif isinstance(to_return, NodeOutput):
            pass
        elif isinstance(to_return, tuple):
            to_return = NodeOutput(*to_return)
        elif isinstance(to_return, dict):
            to_return = NodeOutput.from_dict(to_return)
        elif isinstance(to_return, ExecutionBlocker):
            to_return = NodeOutput(block_execution=to_return.message)
        else:
            raise Exception(f"Invalid return type from node: {type(to_return)}")
        return to_return

    @final
    @classmethod
    def PREPARE_CLASS_CLONE(cls, v3_data: V3Data | None) -> type[ComfyNode]:
        """Creates clone of real node class to prevent monkey-patching."""
        c_type: type[ComfyNode] = cls if is_class(cls) else type(cls)
        type_clone: type[ComfyNode] = shallow_clone_class(c_type)
        # set hidden
        type_clone.hidden = HiddenHolder.from_v3_data(v3_data)
        return type_clone

    #############################################
    # V1 Backwards Compatibility code
    #--------------------------------------------
    @final
    @classmethod
    def GET_NODE_INFO_V1(cls) -> dict[str, Any]:
        schema = cls.GET_SCHEMA()
        info = schema.get_v1_info(cls)
        return asdict(info)

    _DESCRIPTION = None
    @final
    @classproperty
    def DESCRIPTION(cls):  # noqa
        if cls._DESCRIPTION is None:
            cls.GET_SCHEMA()
        return cls._DESCRIPTION

    _CATEGORY = None
    @final
    @classproperty
    def CATEGORY(cls):  # noqa
        if cls._CATEGORY is None:
            cls.GET_SCHEMA()
        return cls._CATEGORY

    _EXPERIMENTAL = None
    @final
    @classproperty
    def EXPERIMENTAL(cls):  # noqa
        if cls._EXPERIMENTAL is None:
            cls.GET_SCHEMA()
        return cls._EXPERIMENTAL

    _DEPRECATED = None
    @final
    @classproperty
    def DEPRECATED(cls):  # noqa
        if cls._DEPRECATED is None:
            cls.GET_SCHEMA()
        return cls._DEPRECATED

    _DEV_ONLY = None
    @final
    @classproperty
    def DEV_ONLY(cls):  # noqa
        if cls._DEV_ONLY is None:
            cls.GET_SCHEMA()
        return cls._DEV_ONLY

    _API_NODE = None
    @final
    @classproperty
    def API_NODE(cls):  # noqa
        if cls._API_NODE is None:
            cls.GET_SCHEMA()
        return cls._API_NODE

    _OUTPUT_NODE = None
    @final
    @classproperty
    def OUTPUT_NODE(cls):  # noqa
        if cls._OUTPUT_NODE is None:
            cls.GET_SCHEMA()
        return cls._OUTPUT_NODE

    _INPUT_IS_LIST = None
    @final
    @classproperty
    def INPUT_IS_LIST(cls):  # noqa
        if cls._INPUT_IS_LIST is None:
            cls.GET_SCHEMA()
        return cls._INPUT_IS_LIST
    _OUTPUT_IS_LIST = None

    @final
    @classproperty
    def OUTPUT_IS_LIST(cls):  # noqa
        if cls._OUTPUT_IS_LIST is None:
            cls.GET_SCHEMA()
        return cls._OUTPUT_IS_LIST

    _RETURN_TYPES = None
    @final
    @classproperty
    def RETURN_TYPES(cls):  # noqa
        if cls._RETURN_TYPES is None:
            cls.GET_SCHEMA()
        return cls._RETURN_TYPES

    _RETURN_NAMES = None
    @final
    @classproperty
    def RETURN_NAMES(cls):  # noqa
        if cls._RETURN_NAMES is None:
            cls.GET_SCHEMA()
        return cls._RETURN_NAMES

    _OUTPUT_TOOLTIPS = None
    @final
    @classproperty
    def OUTPUT_TOOLTIPS(cls):  # noqa
        if cls._OUTPUT_TOOLTIPS is None:
            cls.GET_SCHEMA()
        return cls._OUTPUT_TOOLTIPS

    _NOT_IDEMPOTENT = None
    @final
    @classproperty
    def NOT_IDEMPOTENT(cls):  # noqa
        if cls._NOT_IDEMPOTENT is None:
            cls.GET_SCHEMA()
        return cls._NOT_IDEMPOTENT

    _ACCEPT_ALL_INPUTS = None
    @final
    @classproperty
    def ACCEPT_ALL_INPUTS(cls):  # noqa
        if cls._ACCEPT_ALL_INPUTS is None:
            cls.GET_SCHEMA()
        return cls._ACCEPT_ALL_INPUTS

    @final
    @classmethod
    def INPUT_TYPES(cls) -> dict[str, dict]:
        schema = cls.FINALIZE_SCHEMA()
        info = schema.get_v1_info(cls)
        return info.input

    @final
    @classmethod
    def FINALIZE_SCHEMA(cls):
        """Call define_schema and finalize it."""
        schema = cls.define_schema()
        schema.finalize()
        return schema

    @final
    @classmethod
    def GET_SCHEMA(cls) -> Schema:
        """Validate node class, finalize schema, validate schema, and set expected class properties."""
        cls.VALIDATE_CLASS()
        schema = cls.FINALIZE_SCHEMA()
        schema.validate()
        if cls._DESCRIPTION is None:
            cls._DESCRIPTION = schema.description
        if cls._CATEGORY is None:
            cls._CATEGORY = schema.category
        if cls._EXPERIMENTAL is None:
            cls._EXPERIMENTAL = schema.is_experimental
        if cls._DEPRECATED is None:
            cls._DEPRECATED = schema.is_deprecated
        if cls._DEV_ONLY is None:
            cls._DEV_ONLY = schema.is_dev_only
        if cls._API_NODE is None:
            cls._API_NODE = schema.is_api_node
        if cls._OUTPUT_NODE is None:
            cls._OUTPUT_NODE = schema.is_output_node
        if cls._INPUT_IS_LIST is None:
            cls._INPUT_IS_LIST = schema.is_input_list
        if cls._NOT_IDEMPOTENT is None:
            cls._NOT_IDEMPOTENT = schema.not_idempotent
        if cls._ACCEPT_ALL_INPUTS is None:
            cls._ACCEPT_ALL_INPUTS = schema.accept_all_inputs

        if cls._RETURN_TYPES is None:
            output = []
            output_name = []
            output_is_list = []
            output_tooltips = []
            if schema.outputs:
                for o in schema.outputs:
                    output.append(o.io_type)
                    output_name.append(o.display_name if o.display_name else o.io_type)
                    output_is_list.append(o.is_output_list)
                    output_tooltips.append(o.tooltip if o.tooltip else None)

            cls._RETURN_TYPES = output
            cls._RETURN_NAMES = output_name
            cls._OUTPUT_IS_LIST = output_is_list
            cls._OUTPUT_TOOLTIPS = output_tooltips
        cls.SCHEMA = schema
        return schema
    #--------------------------------------------
    #############################################

class ComfyNode(_ComfyNodeBaseInternal):
    """Common base class for all V3 nodes."""

    @classmethod
    @abstractmethod
    def define_schema(cls) -> Schema:
        """Override this function with one that returns a Schema instance."""
        raise NotImplementedError

    @classmethod
    @abstractmethod
    def execute(cls, **kwargs) -> NodeOutput:
        """Override this function with one that performs node's actions."""
        raise NotImplementedError

    @classmethod
    def validate_inputs(cls, **kwargs) -> bool | str:
        """Optionally, define this function to validate inputs; equivalent to V1's VALIDATE_INPUTS."""
        raise NotImplementedError

    @final
    @classmethod
    def GET_BASE_CLASS(cls):
        """DO NOT override this class. Will break things in execution.py."""
        return ComfyNode


class NodeOutput(_NodeOutputInternal):
    '''
    Standardized output of a node; can pass in any number of args and/or a UIOutput into 'ui' kwarg.
    '''
    def __init__(self, *args: Any, ui: _UIOutput | dict=None, expand: dict=None, block_execution: str=None):
        self.args = args
        self.ui = ui
        self.expand = expand
        self.block_execution = block_execution

    @property
    def result(self):
        return self.args if len(self.args) > 0 else None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> NodeOutput:
        args = ()
        ui = None
        expand = None
        if "result" in data:
            result = data["result"]
            if isinstance(result, ExecutionBlocker):
                return cls(block_execution=result.message)
            args = result
        if "ui" in data:
            ui = data["ui"]
        if "expand" in data:
            expand = data["expand"]
        return cls(*args, ui=ui, expand=expand)

    def __getitem__(self, index) -> Any:
        return self.args[index]

class _UIOutput(ABC):
    def __init__(self):
        pass

    @abstractmethod
    def as_dict(self) -> dict:
        ...
