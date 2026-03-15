// =============================================================================
// Preview Node Schemas
// Frontend-only "output sink" nodes for visualising workflow results.
// These nodes never get submitted to ComfyUI — they only display values that
// flow into them from upstream nodes after a job completes.
// =============================================================================

import type { NodeSchemaDef } from "../types";

export const PREVIEW_SCHEMAS: Record<string, NodeSchemaDef> = {
  PreviewTextNode: {
    input: {
      required: {
        text: [
          "STRING",
          {
            tooltip: "Connect a text output to preview the result here.",
            forceInput: true,
            multiline: false,
          },
        ],
      },
    },
    output: [],
    output_is_list: [],
    output_name: [],
    output_tooltips: [],
    output_matchtypes: null,
    name: "PreviewTextNode",
    display_name: "Preview Text",
    description: "Displays text output from any upstream node.",
    python_module: "",
    category: "output/preview",
    output_node: true,
    deprecated: false,
    experimental: false,
    dev_only: false,
    api_node: false,
    price_badge: null,
    search_aliases: null,
    essentials_category: null,
  },

  PreviewImageNode: {
    input: {
      required: {
        image_uuid: [
          "STRING",
          {
            tooltip: "Connect an image_uuid output to preview the image.",
            forceInput: true,
            multiline: false,
          },
        ],
      },
    },
    output: [],
    output_is_list: [],
    output_name: [],
    output_tooltips: [],
    output_matchtypes: null,
    name: "PreviewImageNode",
    display_name: "Preview Image",
    description: "Fetches and displays an image from the media-ingest service.",
    python_module: "",
    category: "output/preview",
    output_node: true,
    deprecated: false,
    experimental: false,
    dev_only: false,
    api_node: false,
    price_badge: null,
    search_aliases: null,
    essentials_category: null,
  },

  PreviewVideoNode: {
    input: {
      required: {
        video_uuid: [
          "STRING",
          {
            tooltip: "Connect a video_uuid output to preview the video.",
            forceInput: true,
            multiline: false,
          },
        ],
      },
    },
    output: [],
    output_is_list: [],
    output_name: [],
    output_tooltips: [],
    output_matchtypes: null,
    name: "PreviewVideoNode",
    display_name: "Preview Video",
    description: "Fetches and plays a video from the media-ingest service.",
    python_module: "",
    category: "output/preview",
    output_node: true,
    deprecated: false,
    experimental: false,
    dev_only: false,
    api_node: false,
    price_badge: null,
    search_aliases: null,
    essentials_category: null,
  },

  ImportMediaNode: {
    input: {
      required: {},
      optional: {},
    },
    output: ["STRING", "STRING"],
    output_is_list: [false, false],
    output_name: ["image_uuid", "video_uuid"],
    output_tooltips: ["Image UUID output", "Video UUID output"],
    output_matchtypes: null,
    name: "ImportMediaNode",
    display_name: "Import Media",
    description: "Attach an image or video asset from the Media Library as a canvas input.",
    python_module: "",
    category: "input/import",
    output_node: false,
    deprecated: false,
    experimental: false,
    dev_only: false,
    api_node: false,
    price_badge: null,
    search_aliases: null,
    essentials_category: null,
  },
};

/** The node type string used by ReactFlow for preview nodes */
export const PREVIEW_NODE_TYPE = "preview-node" as const;

/** Schema names that correspond to preview nodes */
export const PREVIEW_SCHEMA_NAMES = new Set(Object.keys(PREVIEW_SCHEMAS));
