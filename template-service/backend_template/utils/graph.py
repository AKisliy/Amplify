def convert_reactflow_to_comfy(graph: dict) -> dict:
    """
    Converts a ReactFlow graph (as stored in project_templates.current_graph_json)
    into the ComfyUI prompt format expected by POST /api/prompt.

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

    # build output slot index map: node_id → { output_port_id → slot_index }
    # use positional indices for output ports, in the order they are declared.
    output_slot_map: dict[str, dict[str, int]] = {}
    for node_id, node in nodes.items():
        ports = node.get("data", {}).get("ports", [])
        output_ports = [p for p in ports if p.get("direction") == "output"]
        output_slot_map[node_id] = {p["id"]: idx for idx, p in enumerate(output_ports)}

    # map: (target_node_id, target_port_id) → [source_node_id, slot_index]
    link_map: dict[tuple[str, str], list] = {}
    for edge in edges:
        source_id = edge["source"]
        source_handle = edge["sourceHandle"]
        target_id = edge["target"]
        target_handle = edge["targetHandle"]
        slot_index = output_slot_map.get(source_id, {}).get(source_handle, 0)
        link_map[(target_id, target_handle)] = [source_id, slot_index]

    # Assemble ComfyUI prompt
    prompt: dict[str, dict] = {}
    for node_id, node in nodes.items():
        data = node.get("data", {})
        class_type = data.get("schemaName", "Unknown")
        inputs: dict = dict(data.get("config", {}))

        # Replace any input that has an incoming edge with a link tuple
        for (target_id, target_port), link in link_map.items():
            if target_id == node_id:
                inputs[target_port] = link

        prompt[node_id] = {
            "class_type": class_type,
            "inputs": inputs,
        }

    return prompt
