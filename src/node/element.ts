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
import {
    createStep,
    currentIsLineBreak,
    equalCursor,
    filterFirstAttrSteps,
    findStartTagLevel,
    ignoreSpaceFindCharCursor,
    ignoreSpaceIsHeadTail,
    isElementEndTagBegin,
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
import { tryParseAttrs, serializeNodeAttrs } from "./attr";
import { boundStepsToContext, checkCommonOption, checkTagBoundaryNearSpace } from "../option";
import { DEFAULT_PARSE_OPTIONS, REX_SPACE } from "../var";
import { checkAllowNodeNotClose, checkOptionAllow } from "../option";
import { tryParseStartTag, tryParseEndTag } from "./tag";
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

const equalTagName = (
    endTagName: string,
    nodeAnterior: FxNode,
    context: FxParseContext
): boolean => {
    if (nodeAnterior.name === endTagName) {
        return true;
    }
    if (
        (nodeAnterior.name || "").toLowerCase() === (endTagName || "").toLowerCase() &&
        checkOptionAllow(
            context.options,
            "ignoreTagNameCaseEqual",
            DEFAULT_PARSE_OPTIONS.ignoreTagNameCaseEqual,
            nodeAnterior.name,
            endTagName,
            nodeAnterior,
            context
        )
    ) {
        return true;
    }
    return false;
};

export const ElementParser: FxNodeAdapter = {
    nodeNature: FxNodeNature.children,
    nodeType: FxNodeType.element,
    attrLeftBoundaryChar: /^'|^"/,
    attrRightBoundaryChar: /^'|^"/,
    attrBoundaryCharNeedEqual: true,
    allowNodeNotClose: FxNodeParserAllowNodeNotCloseOption.followParserOptions,
    parseMatch: /^<\s*\/|^</,
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
            const lastStep = steps[steps.length - 1];
            if (lastStep.step !== FxEventType.error) {
                const endTagEndStep = steps.find((item) => item.step === FxEventType.endTagEnd);
                const endTagName = endTagEndStep.data as string;
                const matchStartTagLevel = findStartTagLevel(steps, context, (node: FxNode) => {
                    return equalTagName(endTagName, node, context);
                });
                if (matchStartTagLevel === -1) {
                    const cursor = steps[0].cursor;
                    steps = [];
                    pushStep(steps, FxEventType.error, cursor, END_TAG_NOT_MATCH_START);
                } else if (matchStartTagLevel > 0) {
                    let middleSteps = [];
                    let node: FxNode;
                    for (let level = 0; level < matchStartTagLevel; level++) {
                        node = node ? node.parent : context.currentNode;
                        const nodeLastStep = node.steps[node.steps.length - 1];
                        const nodeFirstStep = node.steps[0];
                        if (!checkAllowNodeNotClose(node, context, node.parser)) {
                            pushStep(steps, FxEventType.error, nodeLastStep.cursor, TAG_NOT_CLOSE);
                            break;
                        }
                        pushStep(middleSteps, FxEventType.nodeEnd, nodeLastStep.cursor, [
                            nodeFirstStep.data as FxNodeAdapter,
                            FxNodeCloseType.startTagClosed,
                        ]);
                    }
                    steps = middleSteps.concat(steps);
                }
            }
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
