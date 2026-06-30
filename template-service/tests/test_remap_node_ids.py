import uuid

import pytest

from backend_template.utils.graph import remap_node_ids


def _make_graph(node_ids: list[str]) -> dict:
    """Build a minimal ReactFlow graph with the given node IDs connected in a chain."""
    nodes = [
        {"id": nid, "data": {"schemaName": "SomeNode", "config": {}, "ports": []}}
        for nid in node_ids
    ]
    edges = [
        {
            "source": node_ids[i],
            "sourceHandle": "output",
            "target": node_ids[i + 1],
            "targetHandle": "input",
        }
        for i in range(len(node_ids) - 1)
    ]
    return {"nodes": nodes, "edges": edges}


class TestRemapNodeIds:
    def test_all_node_ids_are_replaced(self):
        original_ids = [str(uuid.uuid4()) for _ in range(3)]
        graph = _make_graph(original_ids)

        result = remap_node_ids(graph)

        result_ids = [n["id"] for n in result["nodes"]]
        for old_id in original_ids:
            assert old_id not in result_ids

    def test_new_ids_are_valid_uuids(self):
        original_ids = [str(uuid.uuid4()) for _ in range(2)]
        graph = _make_graph(original_ids)

        result = remap_node_ids(graph)

        for node in result["nodes"]:
            uuid.UUID(node["id"])  # raises if not a valid UUID

    def test_edges_updated_to_new_ids(self):
        original_ids = [str(uuid.uuid4()) for _ in range(3)]
        graph = _make_graph(original_ids)

        result = remap_node_ids(graph)

        new_ids = {n["id"] for n in result["nodes"]}
        for edge in result["edges"]:
            assert edge["source"] in new_ids
            assert edge["target"] in new_ids

    def test_two_duplicates_have_disjoint_ids(self):
        original_ids = [str(uuid.uuid4()) for _ in range(3)]
        graph = _make_graph(original_ids)

        copy_a = remap_node_ids(graph)
        copy_b = remap_node_ids(graph)

        ids_a = {n["id"] for n in copy_a["nodes"]}
        ids_b = {n["id"] for n in copy_b["nodes"]}
        assert ids_a.isdisjoint(ids_b)

    def test_original_graph_is_not_mutated(self):
        original_ids = [str(uuid.uuid4()) for _ in range(2)]
        graph = _make_graph(original_ids)

        remap_node_ids(graph)

        assert [n["id"] for n in graph["nodes"]] == original_ids

    def test_port_ids_are_preserved(self):
        nid = str(uuid.uuid4())
        graph = {
            "nodes": [
                {
                    "id": nid,
                    "data": {
                        "schemaName": "SomeNode",
                        "config": {},
                        "ports": [{"id": "my-port", "direction": "output"}],
                    },
                }
            ],
            "edges": [],
        }

        result = remap_node_ids(graph)

        assert result["nodes"][0]["data"]["ports"][0]["id"] == "my-port"

    def test_empty_graph_does_not_raise(self):
        assert remap_node_ids({}) == {}
        assert remap_node_ids({"nodes": [], "edges": []}) == {"nodes": [], "edges": []}

    def test_node_config_is_preserved(self):
        nid = str(uuid.uuid4())
        graph = {
            "nodes": [{"id": nid, "data": {"schemaName": "X", "config": {"prompt": "hello"}, "ports": []}}],
            "edges": [],
        }

        result = remap_node_ids(graph)

        assert result["nodes"][0]["data"]["config"]["prompt"] == "hello"
