import {
    FxCursorPosition,
    FxEventType,
    FxNode,
    FxNodeCloseType,
    FxNodeJSON,
    FxNodeNature,
    FxNodeAdapter,
    FxNodeParserAllowNodeNotCloseOption,
    FxNodeSerializer,
    FxNodeType,
    FxParseContext,
    FxParseOptions,
    FxSerializeOptions,
    FxTryStep,
    FxBoundaryPosition,
} from "../types";
import { ignoreSpaceIsHeadTail, toCursor } from "../util";
import { serializeNodeAttrs } from "./attr";
import { boundStepsToContext } from "../option";
import { tryParseStartTag, tryParseEndTag, matchTag } from "./tag";
export const tryParseDtdStartTag = (
    xml: string,
    cursor: FxCursorPosition,
    options: FxParseOptions
) => {
    return tryParseStartTag(DtdParser, xml, cursor, options);
};

export const tryParseDtdEndTag = (
    xml: string,
    cursor: FxCursorPosition,
    options: FxParseOptions
): FxTryStep[] => {
    return tryParseEndTag(DtdParser, xml, cursor, options);
};

export const DtdParser: FxNodeAdapter = {
    nodeNature: FxNodeNature.children,
    nodeType: FxNodeType.dtd,
    attrLeftBoundaryChar: /^'|^"|^\(/,
    attrRightBoundaryChar: /^'|^"|^\)/,
    parseMatch: /^<\s*\!|^>|^\]\s*>/,
    checkAttrsEnd(xml: string, cursor: FxCursorPosition) {
        const char = xml[cursor.offset];
        if (char === ">" || char === "[") {
            return cursor;
        }
    },
    parse(context: FxParseContext) {
        let steps: FxTryStep[];
        const endTagStartCursor = ignoreSpaceIsHeadTail(context.xml, toCursor(context), "]", ">");
        if (endTagStartCursor) {
            // 解析endTag
            steps = tryParseDtdEndTag(
                context.xml,
                {
                    lineNumber: context.lineNumber,
                    column: context.column,
                    offset: context.offset,
                },
                context.options
            );
            steps = matchTag(DtdParser, context, steps);
        } else {
            steps = tryParseDtdStartTag(
                context.xml,
                {
                    lineNumber: context.lineNumber,
                    column: context.column,
                    offset: context.offset,
                },
                context.options
            );
        }
        boundStepsToContext(steps, context);
    },
    serializeMatch(node: FxNodeJSON): boolean {
        return node.type === FxNodeType.dtd;
    },
    serialize(
        node: FxNodeJSON,
        siblingNodes: FxNodeJSON[],
        rootNodes: FxNodeJSON[],
        rootSerializer: FxNodeSerializer,
        options: FxSerializeOptions,
        parentNode?: FxNodeJSON
    ): string {
        let res = "<!";
        if (node.name) {
            res += node.name;
        }
        res += serializeNodeAttrs(node, rootNodes, rootSerializer, options);
        if (node.children && node.children.length) {
            res += "[";
            res += rootSerializer(node.children, options, node);
            if (!node.closeType || node.closeType === FxNodeCloseType.fullClosed) {
                res += `]>`;
            }
        } else {
            if (
                !node.closeType ||
                node.closeType === FxNodeCloseType.fullClosed ||
                node.closeType === FxNodeCloseType.startTagClosed
            ) {
                res += ">";
            }
        }
        return res;
    },
};
