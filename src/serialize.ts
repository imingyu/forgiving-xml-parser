import { LxNodeJSON, LxSerializeOptions } from "./types";
import { DEFAULT_SERIALIZE_OPTIONS } from "./var";
import { findNodeSerializer } from "./util";
import { CommentParser } from "./node/comment";
import { CDATAParser } from "./node/cdata";
import { ElementParser } from "./node/element";
import { TextParser } from "./node/text";
DEFAULT_SERIALIZE_OPTIONS.nodeParser = [
    CommentParser,
    CDATAParser,
    ElementParser,
];
export const serialize = (
    nodes: LxNodeJSON[],
    options?: LxSerializeOptions
): string => {
    options = typeof options !== "object" ? {} : options;
    options = Object.assign({}, DEFAULT_SERIALIZE_OPTIONS, options);
    const rootNodes = nodes;
    const rootSerialize = (
        nodes: LxNodeJSON[],
        options: LxSerializeOptions
    ) => {
        let xml = "";
        nodes.forEach((node) => {
            let serializer = findNodeSerializer(
                node,
                nodes,
                rootNodes,
                options
            );
            serializer = serializer || TextParser;
            xml += serializer.serialize(
                node,
                nodes,
                rootNodes,
                rootSerialize,
                options
            );
        });
        return xml;
    };
    return rootSerialize(nodes, options);
};
