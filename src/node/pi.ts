import {
    checkPIStartTagStart,
    moveCursor,
    pushStep,
    equalCursor,
    checkPIEndTagStart,
    currentIsLineBreak,
} from "../util";
import { boundStepsToContext } from "../init";
import {
    LxCursorPosition,
    LxEventType,
    LxNodeCloseType,
    LxNodeJSON,
    LxNodeNature,
    LxNodeParser,
    LxNodeParserAllowNodeNotCloseOption,
    LxNodeSerializer,
    LxNodeType,
    LxParseContext,
    LxParseOptions,
    LxSerializeOptions,
    LxTagType,
    LxTryStep,
} from "../types";
import { AttrParser, tryParseAttrs } from "./attr";
import { DEFAULT_PARSE_OPTIONS } from "src/var";
import { checkOptionAllow } from "src/option";
import { BOUNDARY_HAS_SPACE, TAG_NAME_IS_EMPTY } from "src/message";

export const tryParsePI = (
    xml: string,
    cursor: LxCursorPosition,
    options: LxParseOptions
): LxTryStep[] => {
    let steps: LxTryStep[] = [];
    pushStep(steps, LxEventType.nodeStart, cursor, [
        LxNodeType.processingInstruction,
        ProcessingInstructionParser,
    ]);
    pushStep(steps, LxEventType.startTagStart, cursor);
    const startTagEndCursor = checkPIStartTagStart(xml, cursor);
    const expectStartTagEndCursor = moveCursor(
        {
            ...cursor,
        },
        0,
        1,
        1
    );
    const mockCursor = Object.assign({}, cursor, startTagEndCursor);
    moveCursor(mockCursor, 0, 1, 1);
    const firstAttrSteps = tryParseAttrs(
        xml,
        mockCursor,
        ProcessingInstructionParser,
        options,
        (currentAttrSteps: LxTryStep[]): boolean => {
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
                nodeName
            )
        ) {
            return pushStep(
                steps,
                LxEventType.error,
                expectStartTagEndCursor,
                BOUNDARY_HAS_SPACE
            );
        }
    }
    Object.assign(cursor, startTagEndCursor);
    moveCursor(cursor, 0, 1, 1);
    if (nodeName) {
        const fullNodeName = xml.substring(
            cursor.offset,
            mockCursor.offset + 1
        );
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
                    LxTagType.startTag
                )
            ) {
                return pushStep(
                    steps,
                    LxEventType.error,
                    cursor,
                    BOUNDARY_HAS_SPACE
                );
            }
            pushStep(steps, LxEventType.nodeNameStart, cursor);
            pushStep(steps, LxEventType.nodeNameEnd, mockCursor, fullNodeName);
        } else {
            pushStep(
                steps,
                LxEventType.nodeNameStart,
                firstAttrSteps[0].cursor
            );
            pushStep(steps, LxEventType.nodeNameEnd, mockCursor, nodeName);
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
        return pushStep(
            steps,
            LxEventType.error,
            startTagEndCursor,
            TAG_NAME_IS_EMPTY
        );
    }

    // 开始解析属性
    pushStep(steps, LxEventType.attrsStart, cursor);
    const attrSteps = tryParseAttrs(
        xml,
        cursor,
        ProcessingInstructionParser,
        options
    );
    steps = steps.concat(attrSteps);

    pushStep(steps, LxEventType.attrsEnd, cursor);
    const xmlLength = xml.length;
    if (cursor.offset < xmlLength - 1) {
        for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
            const char = xml[cursor.offset];
            if (char === "?") {
                pushStep(steps, LxEventType.endTagStart, cursor);
                continue;
            }
            if (char === ">") {
                pushStep(steps, LxEventType.endTagEnd, cursor);
                pushStep(steps, LxEventType.nodeEnd, cursor, [
                    LxNodeType.processingInstruction,
                    LxNodeCloseType.fullClosed,
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

export const ProcessingInstructionParser: LxNodeParser = {
    nodeNature: LxNodeNature.alone,
    nodeType: LxNodeType.processingInstruction,
    parseMatch: /^<\s*\?/,
    attrLeftBoundaryChar: /^'|^"/,
    attrRightBoundaryChar: /^'|^"/,
    attrBoundaryCharNeedEqual: true,
    allowNodeNotClose: LxNodeParserAllowNodeNotCloseOption.allow,
    checkAttrsEnd(xml: string, cursor: LxCursorPosition) {
        return checkPIEndTagStart(xml, cursor);
    },
    parse(context: LxParseContext) {
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
    serializeMatch(node: LxNodeJSON): boolean {
        return node.type === LxNodeType.processingInstruction;
    },
    serialize(
        node: LxNodeJSON,
        brotherNodes: LxNodeJSON[],
        rootNodes: LxNodeJSON[],
        rootSerializer: LxNodeSerializer,
        options: LxSerializeOptions
    ): string {
        let res = "<?";
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
        if (!node.closeType || node.closeType === LxNodeCloseType.fullClosed) {
            res += `?>`;
        }
        return res;
    },
};
