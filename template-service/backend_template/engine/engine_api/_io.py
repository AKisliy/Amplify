import inspect
from abc import ABC, abstractmethod
from collections import Counter
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, TypeVar, TypedDict, Literal
from typing_extensions import final

from ._util import (copy_class, prune_dict, _NodeOutputInternal, is_class, shallow_clone_class, first_real_override, classproperty, ExecutionBlocker)


class FolderType(str, Enum):
    input = "input"
    output = "output"
    temp = "temp"


class UploadType(str, Enum):
    image = "image_upload"
    audio = "audio_upload"
    video = "video_upload"
    model = "file_upload"

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
    def __init__(self, id: str, display_name: str=None, optional=False, tooltip: str=None, default: Any=None,
                 socketless: bool=None, widget_type: str=None, force_input: bool=None, extra_dict=None, advanced: bool=None):
        super().__init__(id, display_name, optional, tooltip, extra_dict, advanced)
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
    def __init__(self, id: str=None, display_name: str=None, tooltip: str=None):
        self.id = id
        self.display_name = display_name if display_name else id
        self.tooltip = tooltip

    def as_dict(self):
        display_name = self.display_name if self.display_name else self.id
        return prune_dict({
            "display_name": display_name,
            "tooltip": self.tooltip,
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
            super().__init__(id, display_name, optional, tooltip, default, socketless, None, force_input, extra_dict, advanced)
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
            super().__init__(id, display_name, optional, tooltip, default, socketless, None, force_input, extra_dict, advanced)
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
            super().__init__(id, display_name, optional, tooltip, default, socketless, None, force_input, extra_dict, advanced)
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
            super().__init__(id, display_name, optional, tooltip, default, socketless, None, None, extra_dict, advanced)
            self.multiselect = False
            self.options = options
            self.remote = remote
            self.default: str

        def as_dict(self):
            return super().as_dict() | prune_dict({
                "multiselect": self.multiselect,
                "options": self.options,
                **({self.upload.value: True} if self.upload is not None else {}),
                "image_folder": self.image_folder.value if self.image_folder else None,
                "remote": self.remote.as_dict() if self.remote else None,
            })

    class Output(Output):
        def __init__(self, id: str=None, display_name: str=None, options: list[str]=None, tooltip: str=None):
            super().__init__(id, display_name, tooltip)
            self.options = options if options is not None else []

class V3Data(TypedDict):
    hidden_inputs: dict[str, Any]
    'Dictionary where the keys are the hidden input ids and the values are the values of the hidden inputs.'
    
class HiddenHolder:
    def __init__(self, unique_id: str, prompt: Any,
                 extra_pnginfo: Any, dynprompt: Any,
                 auth_token_comfy_org: str, api_key_comfy_org: str, **kwargs):
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
    """PROMPT is the complete prompt sent by the client to the server. See the prompt object for a full description."""

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
    is_output_node: bool=False

    is_api_node: bool=False
    price_badge: PriceBadge | None = None

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
    
def add_to_dict_v3(io: Input | Output, d: dict):
    d[io.id] = (io.get_io_type(), io.as_dict())           

class _ComfyNodeBaseInternal():
    """Common base class for storing internal methods and properties; DO NOT USE for defining nodes."""

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

    @final
    @classmethod
    def GET_NODE_INFO_V3(cls) -> dict[str, Any]:
        schema = cls.GET_SCHEMA()
        info = schema.get_v3_info(cls)
        return asdict(info)
    
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
        
        cls.SCHEMA = schema
        return schema

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
    def __init__(self, *args: Any, ui: _UIOutput | dict=None, block_execution: str=None):
        self.args = args
        self.ui = ui
        self.block_execution = block_execution

    @property
    def result(self):
        return self.args if len(self.args) > 0 else None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> NodeOutput:
        args = ()
        ui = None
        if "result" in data:
            result = data["result"]
            if isinstance(result, ExecutionBlocker): # content from the graph_utils file, don't understand it  yet
                return cls(block_execution=result.message)
            args = result
        if "ui" in data:
            ui = data["ui"]
        return cls(*args, ui=ui)

    def __getitem__(self, index) -> Any:
        return self.args[index]

class _UIOutput(ABC):
    def __init__(self):
        pass

    @abstractmethod
    def as_dict(self) -> dict:
        ...

                             