# Frontend-only node schemas that must never be submitted to ComfyUI.
# - FRONTEND_SINK_SCHEMAS: pure output sinks (no outputs) — drop entirely.
# - FRONTEND_SOURCE_SCHEMAS: source nodes with no ComfyUI class — drop from
#   the prompt but inline their config values as literals into connected nodes.
_FRONTEND_SINK_SCHEMAS: frozenset[str] = frozenset({
    "PreviewImageNode",
    "PreviewTextNode",
    "PreviewVideoNode",
})

_FRONTEND_SOURCE_SCHEMAS: frozenset[str] = frozenset({
    "ImportMediaNode",
})


def convert_reactflow_to_comfy(graph: dict) -> dict:
    """
    Converts a ReactFlow graph (as stored in project_templates.current_graph_json)
    into the ComfyUI prompt format expected by POST /api/prompt.

    Frontend-only nodes are handled transparently:
      - Preview sinks (PreviewImageNode, etc.) are dropped — they have no outputs
        so removing them doesn't affect upstream execution.
      - ImportMediaNode is dropped but its config values (image_uuid / video_uuid)
        are inlined as string literals into every node that was connected to it,
        instead of producing a [nodeId, slotIndex] link tuple.

    ReactFlow format:
        {
          "nodes": [{ "id": "...", "data": { "schemaName": "...", "config": {...}, "ports": [...] } }],
          "edges": [{ "source": "...", "sourceHandle": "...", "target": "...", "targetHandle": "..." }]
        }

    ComfyUI format:
        {
          "node_id": {
            "class_type": "NodeClassName",
            "inputs": {
              "widget_input": <value>,
              "connected_input": ["source_node_id", <output_slot_index>]
            }
          }
        }
    """
    nodes: dict[str, dict] = {n["id"]: n for n in graph.get("nodes", [])}
    edges: list[dict] = graph.get("edges", [])

    # Classify nodes
    frontend_sink_ids: set[str] = set()
    frontend_source_ids: set[str] = set()
    for node_id, node in nodes.items():
        schema = node.get("data", {}).get("schemaName", "")
        if schema in _FRONTEND_SINK_SCHEMAS:
            frontend_sink_ids.add(node_id)
        elif schema in _FRONTEND_SOURCE_SCHEMAS:
            frontend_source_ids.add(node_id)

    frontend_only_ids = frontend_sink_ids | frontend_source_ids

    # build output slot index map for ComfyUI nodes only
    output_slot_map: dict[str, dict[str, int]] = {}
    for node_id, node in nodes.items():
        if node_id in frontend_only_ids:
            continue
        ports = node.get("data", {}).get("ports", [])
        output_ports = [p for p in ports if p.get("direction") == "output"]
        output_slot_map[node_id] = {p["id"]: idx for idx, p in enumerate(output_ports)}

    # map: (target_node_id, target_port_id) → resolved value
    # For ComfyUI nodes: [source_node_id, slot_index]
    # For frontend source nodes (ImportMediaNode): literal config value
    link_map: dict[tuple[str, str], object] = {}
    for edge in edges:
        source_id = edge["source"]
        source_handle = edge["sourceHandle"]
        target_id = edge["target"]
        target_handle = edge["targetHandle"]

        # Drop edges that target frontend-only sinks
        if target_id in frontend_only_ids:
            continue

        if source_id in frontend_source_ids:
            # Inline the literal value from the source node's config
            source_config = nodes[source_id].get("data", {}).get("config", {})
            literal = source_config.get(source_handle)
            if literal is not None:
                link_map[(target_id, target_handle)] = literal
        else:
            slot_index = output_slot_map.get(source_id, {}).get(source_handle, 0)
            link_map[(target_id, target_handle)] = [source_id, slot_index]

    # Assemble ComfyUI prompt — skip all frontend-only nodes
    prompt: dict[str, dict] = {}
    for node_id, node in nodes.items():
        if node_id in frontend_only_ids:
            continue

        data = node.get("data", {})
        class_type = data.get("schemaName", "Unknown")
        inputs: dict = dict(data.get("config", {}))

        for (target_id, target_port), value in link_map.items():
            if target_id == node_id:
                inputs[target_port] = value

        prompt[node_id] = {
            "class_type": class_type,
            "inputs": inputs,
        }

    return prompt
