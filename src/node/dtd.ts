import {
    LxCursorPosition,
    LxEventType,
    LxNode,
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
import {
    createStep,
    currentIsLineBreak,
    equalCursor,
    findStartTagLevel,
    ignoreSpaceFindCharCursor,
    ignoreSpaceIsHeadTail,
    moveCursor,
    pushStep,
    toCursor,
} from "../util";
import {
    BOUNDARY_HAS_SPACE,
    END_TAG_NOT_MATCH_START,
    TAG_HAS_MORE_BOUNDARY_CHAR,
    TAG_NAME_IS_EMPTY,
    TAG_NAME_NEAR_SPACE,
    TAG_NOT_CLOSE,
} from "../message";
import { AttrParser, tryParseAttrs } from "./attr";
import { boundStepsToContext } from "../option";
import { DEFAULT_PARSE_OPTIONS, REX_SPACE } from "../var";
import { checkAllowNodeNotClose, checkOptionAllow } from "../option";
export const tryParseDtdStartTag = (
    xml: string,
    cursor: LxCursorPosition,
    options: LxParseOptions
) => {
    let steps: LxTryStep[] = [];
    pushStep(steps, LxEventType.nodeStart, cursor, DtdParser);
    pushStep(steps, LxEventType.startTagStart, cursor);
    const startTagEndCursor = ignoreSpaceIsHeadTail(xml, cursor, "<", "!");
    const expectStartTagEndCursor = moveCursor(toCursor(cursor), 0, 1, 1);
    const mockCursor = toCursor(startTagEndCursor);
    moveCursor(mockCursor, 0, 1, 1);
    const firstAttrSteps = tryParseAttrs(
        xml,
        mockCursor,
        DtdParser,
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
                DtdParser,
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
                    DtdParser,
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
            DtdParser
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
    const attrSteps = tryParseAttrs(xml, cursor, DtdParser, options);
    steps = steps.concat(attrSteps);

    pushStep(steps, LxEventType.attrsEnd, cursor);
    const xmlLength = xml.length;
    if (cursor.offset < xmlLength - 1) {
        for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
            const startTagEndCursor = DtdParser.checkAttrsEnd(
                xml,
                cursor,
                options
            );
            if (startTagEndCursor) {
                Object.assign(cursor, startTagEndCursor);
                pushStep(steps, LxEventType.startTagEnd, cursor);
                if (xml[cursor.offset] === ">") {
                    pushStep(steps, LxEventType.nodeEnd, cursor, DtdParser);
                }
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

export const tryParseDtdEndTag = (
    xml: string,
    cursor: LxCursorPosition,
    options: LxParseOptions,
    endTagStartCursor?: LxCursorPosition
): LxTryStep[] => {
    let steps: LxTryStep[] = [];
    endTagStartCursor =
        endTagStartCursor || ignoreSpaceIsHeadTail(xml, cursor, "]", ">");
    pushStep(steps, LxEventType.endTagStart, cursor);
    const nextCursor: LxCursorPosition = {
        lineNumber: cursor.lineNumber,
        column: cursor.column + 1,
        offset: cursor.offset + 1,
    };
    if (!equalCursor(nextCursor, endTagStartCursor)) {
        if (
            !checkOptionAllow(
                options,
                "allowEndTagBoundaryNearSpace",
                DEFAULT_PARSE_OPTIONS.allowEndTagBoundaryNearSpace,
                null,
                xml,
                nextCursor,
                DtdParser
            )
        ) {
            return pushStep(
                steps,
                LxEventType.error,
                cursor,
                BOUNDARY_HAS_SPACE
            );
        }
    }
    Object.assign(cursor, endTagStartCursor);
    pushStep(steps, LxEventType.endTagEnd, cursor);
    pushStep(steps, LxEventType.nodeEnd, cursor, DtdParser);
    return steps;
};

export const DtdParser: LxNodeParser = {
    nodeNature: LxNodeNature.children,
    nodeType: LxNodeType.dtd,
    attrLeftBoundaryChar: /^'|^"|^\(/,
    attrRightBoundaryChar: /^'|^"|^\)/,
    parseMatch: /^<\s*\!|^>|^\]\s*>/,
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
    parse(context: LxParseContext) {
        let steps: LxTryStep[];
        const endTagStartCursor = ignoreSpaceIsHeadTail(
            context.xml,
            toCursor(context),
            "]",
            ">"
        );
        if (endTagStartCursor) {
            // 解析endTag
            steps = tryParseDtdEndTag(
                context.xml,
                {
                    lineNumber: context.lineNumber,
                    column: context.column,
                    offset: context.offset,
                },
                context.options,
                endTagStartCursor
            );
            const lastStep = steps[steps.length - 1];
            if (lastStep.step !== LxEventType.error) {
                const matchStartTagLevel = findStartTagLevel(
                    steps,
                    context,
                    (node: LxNode) => {
                        return !!(
                            node.type === LxNodeType.dtd && node.children
                        );
                    }
                );
                if (matchStartTagLevel === -1) {
                    const cursor = steps[0].cursor;
                    steps = [];
                    pushStep(
                        steps,
                        LxEventType.error,
                        cursor,
                        END_TAG_NOT_MATCH_START
                    );
                } else if (matchStartTagLevel > 0) {
                    const firstStep = steps[0];
                    let node: LxNode;
                    for (let level = 0; level <= matchStartTagLevel; level++) {
                        node = node ? node.parent : context.currentNode;
                        const nodeLastStep = node.children
                            ? node.children[node.children.length - 1].steps[
                                  node.children[node.children.length - 1].steps
                                      .length - 1
                              ]
                            : node.steps[node.steps.length - 1];
                        const nodeFirstStep = node.steps[0];
                        if (
                            !checkAllowNodeNotClose(node, context, node.parser)
                        ) {
                            pushStep(
                                steps,
                                LxEventType.error,
                                firstStep.cursor,
                                TAG_NOT_CLOSE
                            );
                            break;
                        }
                        pushStep(
                            node.steps,
                            LxEventType.nodeEnd,
                            nodeLastStep.cursor,
                            [
                                nodeFirstStep.data[0],
                                LxNodeCloseType.startTagClosed,
                            ]
                        );
                    }
                }
            }
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
