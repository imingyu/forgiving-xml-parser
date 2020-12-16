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
    FxTagType,
    FxTryStep,
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
import { AttrParser, serializeNodeAttrs, tryParseAttrs } from "./attr";
import { boundStepsToContext } from "../option";
import { DEFAULT_PARSE_OPTIONS, REX_SPACE } from "../var";
import { checkAllowNodeNotClose, checkOptionAllow } from "../option";
export const tryParseDtdStartTag = (
    xml: string,
    cursor: FxCursorPosition,
    options: FxParseOptions
) => {
    let steps: FxTryStep[] = [];
    pushStep(steps, FxEventType.nodeStart, cursor, DtdParser);
    pushStep(steps, FxEventType.startTagStart, cursor);
    const startTagEndCursor = ignoreSpaceIsHeadTail(xml, cursor, "<", "!");
    const expectStartTagEndCursor = moveCursor(toCursor(cursor), 0, 1, 1);
    const mockCursor = toCursor(startTagEndCursor);
    moveCursor(mockCursor, 0, 1, 1);
    const firstAttrSteps = tryParseAttrs(
        xml,
        mockCursor,
        DtdParser,
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
                DtdParser,
                nodeName
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
                    DtdParser,
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
            DtdParser
        )
    ) {
        return pushStep(steps, FxEventType.error, startTagEndCursor, TAG_NAME_IS_EMPTY);
    }

    // 开始解析属性
    pushStep(steps, FxEventType.attrsStart, cursor);
    const attrSteps = tryParseAttrs(xml, cursor, DtdParser, options);
    steps = steps.concat(attrSteps);

    pushStep(steps, FxEventType.attrsEnd, cursor);
    const xmlLength = xml.length;
    if (cursor.offset < xmlLength - 1) {
        for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
            const startTagEndCursor = DtdParser.checkAttrsEnd(xml, cursor, options);
            if (startTagEndCursor) {
                Object.assign(cursor, startTagEndCursor);
                pushStep(steps, FxEventType.startTagEnd, cursor);
                if (xml[cursor.offset] === ">") {
                    pushStep(steps, FxEventType.nodeEnd, cursor, DtdParser);
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
    cursor: FxCursorPosition,
    options: FxParseOptions,
    endTagStartCursor?: FxCursorPosition
): FxTryStep[] => {
    let steps: FxTryStep[] = [];
    endTagStartCursor = endTagStartCursor || ignoreSpaceIsHeadTail(xml, cursor, "]", ">");
    pushStep(steps, FxEventType.endTagStart, cursor);
    const nextCursor: FxCursorPosition = {
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
            return pushStep(steps, FxEventType.error, cursor, BOUNDARY_HAS_SPACE);
        }
    }
    Object.assign(cursor, endTagStartCursor);
    pushStep(steps, FxEventType.endTagEnd, cursor);
    pushStep(steps, FxEventType.nodeEnd, cursor, DtdParser);
    return steps;
};

export const DtdParser: FxNodeAdapter = {
    nodeNature: FxNodeNature.children,
    nodeType: FxNodeType.dtd,
    attrLeftBoundaryChar: /^'|^"|^\(/,
    attrRightBoundaryChar: /^'|^"|^\)/,
    parseMatch: /^<\s*\!|^>|^\]\s*>/,
    allowNodeNotClose: (node: FxNode, context: FxParseContext, parser: FxNodeAdapter): boolean => {
        if (node.type === FxNodeType.dtd && !node.parent) {
        }
        return true;
    },
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
                context.options,
                endTagStartCursor
            );
            const lastStep = steps[steps.length - 1];
            if (lastStep.step !== FxEventType.error) {
                const matchStartTagLevel = findStartTagLevel(steps, context, (node: FxNode) => {
                    return !!(node.type === FxNodeType.dtd && node.children);
                });
                if (matchStartTagLevel === -1) {
                    const cursor = steps[0].cursor;
                    steps = [];
                    pushStep(steps, FxEventType.error, cursor, END_TAG_NOT_MATCH_START);
                } else if (matchStartTagLevel > 0) {
                    const firstStep = steps[0];
                    let node: FxNode;
                    for (let level = 0; level <= matchStartTagLevel; level++) {
                        node = node ? node.parent : context.currentNode;
                        const nodeLastStep = node.children
                            ? node.children[node.children.length - 1].steps[
                                  node.children[node.children.length - 1].steps.length - 1
                              ]
                            : node.steps[node.steps.length - 1];
                        const nodeFirstStep = node.steps[0];
                        if (!checkAllowNodeNotClose(node, context, node.parser)) {
                            pushStep(steps, FxEventType.error, firstStep.cursor, TAG_NOT_CLOSE);
                            break;
                        }
                        pushStep(node.steps, FxEventType.nodeEnd, nodeLastStep.cursor, [
                            nodeFirstStep.data[0],
                            FxNodeCloseType.startTagClosed,
                        ]);
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
    serializeMatch(node: FxNodeJSON): boolean {
        return node.type === FxNodeType.dtd;
    },
    serialize(
        node: FxNodeJSON,
        brotherNodes: FxNodeJSON[],
        rootNodes: FxNodeJSON[],
        rootSerializer: FxNodeSerializer,
        options: FxSerializeOptions,
        parentNode?: FxNodeJSON
    ): string {
        let res = "<!";
        if (node.name) {
            res += node.name;
        }
        serializeNodeAttrs(node, rootNodes, rootSerializer, options);
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
