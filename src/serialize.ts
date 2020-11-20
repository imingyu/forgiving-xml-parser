import { LxNodeJSON, LxSerializeOptions } from "./types";
import { DEFAULT_SERIALIZE_OPTIONS } from "./var";
import { findNodeSerializer } from "./util";
import { CommentParser } from "./node/comment";
import { CDATAParser } from "./node/cdata";
import { ElementParser } from "./node/element";
import { DtdParser } from "./node/dtd";
import { ProcessingInstructionParser } from "./node/pi";
import { TextParser } from "./node/text";
DEFAULT_SERIALIZE_OPTIONS.nodeParser = [
    CommentParser,
    CDATAParser,
    ProcessingInstructionParser,
    DtdParser,
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
