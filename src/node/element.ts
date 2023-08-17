import {
    FxCursorPosition,
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
} from "../types";
import { ignoreSpaceFindCharCursor, isElementEndTagBegin, moveCursor } from "../util";
import { serializeNodeAttrs } from "./attr";
import { boundStepsToContext } from "../option";
import { tryParseStartTag, tryParseEndTag, matchTag } from "./tag";
export const tryParseElementStartTag = (
    xml: string,
    cursor: FxCursorPosition,
    options: FxParseOptions
) => {
    return tryParseStartTag(ElementParser, xml, cursor, options);
};

export const tryParseElementEndTag = (
    xml: string,
    cursor: FxCursorPosition,
    options: FxParseOptions
): FxTryStep[] => {
    return tryParseEndTag(ElementParser, xml, cursor, options);
};

export const ElementParser: FxNodeAdapter = {
    nodeNature: FxNodeNature.children,
    nodeType: FxNodeType.element,
    attrLeftBoundaryChar: /^'|^"/,
    attrRightBoundaryChar: /^'|^"/,
    attrBoundaryCharNeedEqual: true,
    allowNodeNotClose: FxNodeParserAllowNodeNotCloseOption.followParserOptions,
    parseMatch: (xml, cursor, options) => {
        const str = xml.substring(cursor.offset);
        const mt = /^<\s*\/|^</.test(str);
        if (!mt) {
            return false;
        }
        let firstChar;
        for (let i = 1, len = str.length; i < len; i++) {
            if (str[i] === "/" || str[i] === ">") {
                break;
            }
            if (!/\s/.test(str[i])) {
                firstChar = str[i];
                break;
            }
        }
        if (!firstChar) {
            return true;
        }
        return /[a-zA-Z0-9\-_]/.test(firstChar);
    },
    checkAttrsEnd(xml: string, cursor: FxCursorPosition) {
        const char = xml[cursor.offset];
        if (char === ">") {
            return cursor;
        }
        if (char === "/") {
            const nextCursor = moveCursor(
                {
                    ...cursor,
                },
                0,
                1,
                1
            );
            return ignoreSpaceFindCharCursor(xml, nextCursor, ">");
        }
    },
    parse(context: FxParseContext) {
        let steps: FxTryStep[];
        const endTagStartCursor = isElementEndTagBegin(context.xml, context);
        if (endTagStartCursor) {
            // 解析endTag
            steps = tryParseElementEndTag(
                context.xml,
                {
                    lineNumber: context.lineNumber,
                    column: context.column,
                    offset: context.offset,
                },
                context.options
            );
            steps = matchTag(ElementParser, context, steps);
        } else {
            steps = tryParseElementStartTag(
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
        return node.type === FxNodeType.element;
    },
    serialize(
        node: FxNodeJSON,
        siblingNodes: FxNodeJSON[],
        rootNodes: FxNodeJSON[],
        rootSerializer: FxNodeSerializer,
        options: FxSerializeOptions
    ): string {
        let res = "<";
        if (node.name) {
            res += node.name;
        }
        res += serializeNodeAttrs(node, rootNodes, rootSerializer, options);
        if (node.closeType === FxNodeCloseType.selfCloseing) {
            res += " />";
            return res;
        }
        if (
            !node.closeType ||
            node.closeType === FxNodeCloseType.fullClosed ||
            node.closeType === FxNodeCloseType.startTagClosed
        ) {
            res += ">";
        }
        if (node.children && node.children.length) {
            res += rootSerializer(node.children, options, node);
        }
        if (!node.closeType || node.closeType === FxNodeCloseType.fullClosed) {
            res += `</${node.name || ""}>`;
        }
        return res;
    },
};
