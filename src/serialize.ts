import { FxNodeJSON, FxSerializeOptions } from "./types";
import { findNodeSerializer } from "./util";
import { TextParser } from "./node/text";
import { DEFAULT_PARSE_OPTIONS } from "./var";
export const serialize = (
    nodes: FxNodeJSON | FxNodeJSON[],
    options?: FxSerializeOptions
): string => {
    if (!nodes || typeof nodes !== "object") {
        return;
    }
    if (!Array.isArray(nodes)) {
        nodes = [nodes];
    }
    options = Object.assign(
        {
            nodeAdapters: DEFAULT_PARSE_OPTIONS.nodeAdapters,
        },
        typeof options === "object" && options ? options : {}
    );
    const rootNodes = nodes;
    const rootSerialize = (
        nodes: FxNodeJSON[],
        options: FxSerializeOptions,
        parentNode?: FxNodeJSON
    ) => {
        let xml = "";
        nodes.forEach((node) => {
            let serializer = findNodeSerializer(
                node,
                nodes,
                rootNodes,
                options,
                parentNode
            );
            serializer = serializer || TextParser;
            xml += serializer.serialize(
                node,
                nodes,
                rootNodes,
                rootSerialize,
                options,
                parentNode
            );
        });
        return xml;
    };
    return rootSerialize(nodes, options);
};
