import {
    moveCursor,
    pushStep,
    equalCursor,
    currentIsLineBreak,
    ignoreSpaceIsHeadTail,
    toCursor,
} from "../util";
import { boundStepsToContext } from "../option";
import {
    FxCursorPosition,
    FxEventType,
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
    FxTagType,
    FxTryStep,
    FxBoundaryPosition,
} from "../types";
import { serializeNodeAttrs, tryParseAttrs } from "./attr";
import { DEFAULT_PARSE_OPTIONS } from "../var";
import { checkOptionAllow } from "../option";
import { BOUNDARY_HAS_SPACE, TAG_NAME_IS_EMPTY } from "../message";

export const tryParsePI = (
    xml: string,
    cursor: FxCursorPosition,
    options: FxParseOptions
): FxTryStep[] => {
    let steps: FxTryStep[] = [];
    pushStep(steps, FxEventType.nodeStart, cursor, ProcessingInstructionParser);
    pushStep(steps, FxEventType.startTagStart, cursor);
    const startTagEndCursor = ignoreSpaceIsHeadTail(xml, cursor, "<", "?");
    const expectStartTagEndCursor = moveCursor(toCursor(cursor), 0, 1, 1);
    const mockCursor = toCursor(startTagEndCursor);
    moveCursor(mockCursor, 0, 1, 1);
    const firstAttrSteps = tryParseAttrs(
        xml,
        mockCursor,
        ProcessingInstructionParser,
        options,
        (currentAttrSteps: FxTryStep[]): boolean => {
            return true;
        }
    );
    let nodeName = "";
    const attrs = boundStepsToContext(firstAttrSteps, null);
    // 判断第一个属性仅存在名称
    if (attrs[0] && !attrs[0].equalCount && !attrs[0].content) {
        nodeName = attrs[0].name;
    }

    if (!equalCursor(startTagEndCursor, expectStartTagEndCursor)) {
        // 检测option
        if (
            !checkOptionAllow(
                options,
                "allowStartTagBoundaryNearSpace",
                DEFAULT_PARSE_OPTIONS.allowStartTagBoundaryNearSpace,
                nodeName,
                xml,
                expectStartTagEndCursor,
                ProcessingInstructionParser,
                nodeName,
                FxBoundaryPosition.left
            )
        ) {
            return pushStep(steps, FxEventType.error, expectStartTagEndCursor, BOUNDARY_HAS_SPACE);
        }
    }
    Object.assign(cursor, startTagEndCursor);
    moveCursor(cursor, 0, 1, 1);
    if (nodeName) {
        const fullNodeName = xml.substring(cursor.offset, mockCursor.offset + 1);
        if (fullNodeName !== nodeName) {
            if (
                !checkOptionAllow(
                    options,
                    "allowTagNameHasSpace",
                    DEFAULT_PARSE_OPTIONS.allowTagNameHasSpace,
                    nodeName,
                    xml,
                    cursor,
                    ProcessingInstructionParser,
                    fullNodeName,
                    FxTagType.startTag
                )
            ) {
                return pushStep(steps, FxEventType.error, cursor, BOUNDARY_HAS_SPACE);
            }
            pushStep(steps, FxEventType.nodeNameStart, cursor);
            pushStep(steps, FxEventType.nodeNameEnd, mockCursor, fullNodeName);
        } else {
            pushStep(steps, FxEventType.nodeNameStart, firstAttrSteps[0].cursor);
            pushStep(steps, FxEventType.nodeNameEnd, mockCursor, nodeName);
        }
        Object.assign(cursor, mockCursor);
        moveCursor(cursor, 0, 1, 1);
    } else if (
        !checkOptionAllow(
            options,
            "allowNodeNameEmpty",
            DEFAULT_PARSE_OPTIONS.allowNodeNameEmpty,
            null,
            xml,
            startTagEndCursor,
            ProcessingInstructionParser
        )
    ) {
        return pushStep(steps, FxEventType.error, startTagEndCursor, TAG_NAME_IS_EMPTY);
    }

    // 开始解析属性
    pushStep(steps, FxEventType.attrsStart, cursor);
    const attrSteps = tryParseAttrs(xml, cursor, ProcessingInstructionParser, options);
    steps = steps.concat(attrSteps);

    pushStep(steps, FxEventType.attrsEnd, cursor);
    const xmlLength = xml.length;
    if (cursor.offset < xmlLength - 1) {
        for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
            const char = xml[cursor.offset];
            if (char === "?") {
                pushStep(steps, FxEventType.endTagStart, cursor);
                continue;
            }
            if (char === ">") {
                pushStep(steps, FxEventType.endTagEnd, cursor);
                pushStep(steps, FxEventType.nodeEnd, cursor, [
                    ProcessingInstructionParser,
                    FxNodeCloseType.fullClosed,
                ]);
                moveCursor(cursor, 0, 1, 1);
                break;
            }
            const brType = currentIsLineBreak(xml, cursor.offset);
            if (brType != -1) {
                moveCursor(cursor, 1, -cursor.column + 1, !brType ? 0 : 1);
            }
        }
    }
    return steps;
};

export const ProcessingInstructionParser: FxNodeAdapter = {
    nodeNature: FxNodeNature.alone,
    nodeType: FxNodeType.processingInstruction,
    parseMatch: /^<\s*\?/,
    attrLeftBoundaryChar: /^'|^"/,
    attrRightBoundaryChar: /^'|^"/,
    attrBoundaryCharNeedEqual: true,
    allowNodeNotClose: FxNodeParserAllowNodeNotCloseOption.allow,
    checkAttrsEnd(xml: string, cursor: FxCursorPosition) {
        return ignoreSpaceIsHeadTail(xml, cursor, "?", ">");
    },
    parse(context: FxParseContext) {
        boundStepsToContext(
            tryParsePI(
                context.xml,
                {
                    lineNumber: context.lineNumber,
                    column: context.column,
                    offset: context.offset,
                },
                context.options
            ),
            context
        );
    },
    serializeMatch(node: FxNodeJSON): boolean {
        return node.type === FxNodeType.processingInstruction;
    },
    serialize(
        node: FxNodeJSON,
        siblingNodes: FxNodeJSON[],
        rootNodes: FxNodeJSON[],
        rootSerializer: FxNodeSerializer,
        options: FxSerializeOptions
    ): string {
        let res = "<?";
        if (node.name) {
            res += node.name;
        }
        res += serializeNodeAttrs(node, rootNodes, rootSerializer, options);
        if (!node.closeType || node.closeType === FxNodeCloseType.fullClosed) {
            res += `?>`;
        }
        return res;
    },
};
