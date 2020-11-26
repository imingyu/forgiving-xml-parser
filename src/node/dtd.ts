import { getEndCharCursor, moveCursor } from "../util";
import {
    LxCursorPosition,
    LxNode,
    LxNodeCloseType,
    LxNodeJSON,
    LxNodeNature,
    LxNodeParser,
    LxNodeSerializer,
    LxNodeType,
    LxParseContext,
    LxSerializeOptions,
} from "../types";
import { AttrParser } from "./attr";

export const DtdParser: LxNodeParser = {
    nodeNature: LxNodeNature.children,
    nodeType: LxNodeType.dtd,
    attrLeftBoundaryChar: /^'|^"|^\(/,
    attrRightBoundaryChar: /^'|^"|^\)/,
    parseMatch: "<!",
    allowNodeNotClose: (
        node: LxNode,
        context: LxParseContext,
        parser: LxNodeParser
    ): boolean => {
        if (node.type === LxNodeType.dtd && !node.parent) {
        }
        return true;
    },
    checkAttrsEnd(xml: string, cursor: LxCursorPosition) {
        const char = xml[cursor.offset];
        if (char === ">" || char === "[") {
            return cursor;
        }
    },
    parse(context: LxParseContext) {},
    serializeMatch(node: LxNodeJSON): boolean {
        return node.type === LxNodeType.dtd;
    },
    serialize(
        node: LxNodeJSON,
        brotherNodes: LxNodeJSON[],
        rootNodes: LxNodeJSON[],
        rootSerializer: LxNodeSerializer,
        options: LxSerializeOptions,
        parentNode?: LxNodeJSON
    ): string {
        let res = "<!";
        if (node.name) {
            res += node.name;
        }
        if (node.attrs && node.attrs.length) {
            node.attrs.forEach((attr) => {
                res +=
                    " " +
                    AttrParser.serialize(
                        attr,
                        node.attrs,
                        rootNodes,
                        rootSerializer,
                        options,
                        node
                    );
            });
        }
        if (node.children && node.children.length) {
            res += "[";
            res += rootSerializer(node.children, options, node);
            if (
                !node.closeType ||
                node.closeType === LxNodeCloseType.fullClosed
            ) {
                res += `]>`;
            }
        } else {
            if (
                !node.closeType ||
                node.closeType === LxNodeCloseType.fullClosed ||
                node.closeType === LxNodeCloseType.startTagClosed
            ) {
                res += ">";
            }
        }
        return res;
    },
};
