import { LxNodeJSON, LxSerializeOptions } from "./types";
import { findNodeSerializer } from "./util";
import { TextParser } from "./node/text";
import { DEFAULT_PARSE_OPTIONS } from "./var";
export const serialize = (
    nodes: LxNodeJSON | LxNodeJSON[],
    options?: LxSerializeOptions
): string => {
    if (!nodes || typeof nodes !== "object") {
        return;
    }
    if (!Array.isArray(nodes)) {
        nodes = [nodes];
    }
    options = Object.assign(
        {
            nodeParsers: DEFAULT_PARSE_OPTIONS.nodeParsers,
        },
        typeof options === "object" && options ? options : {}
    );
    const rootNodes = nodes;
    const rootSerialize = (
        nodes: LxNodeJSON[],
        options: LxSerializeOptions,
        parentNode?: LxNodeJSON
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
