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
export const tryParseElementStartTag = (
    xml: string,
    cursor: FxCursorPosition,
    options: FxParseOptions
) => {
    let steps: FxTryStep[] = [];
    const xmlLength = xml.length;
    pushStep(steps, FxEventType.nodeStart, cursor, ElementParser);
    pushStep(steps, FxEventType.startTagStart, cursor);
    moveCursor(cursor, 0, 1, 1);
    const elementNodeNameStartStep: FxTryStep = createStep(FxEventType.nodeNameStart, cursor);
    let needParseAttrs;
    let tagName = "";
    const fireStartTagEnd = (startTagEndCursor: FxCursorPosition) => {
        if (
            !tagName &&
            !checkCommonOption(
                options,
                "allowNodeNameEmpty",
                DEFAULT_PARSE_OPTIONS.allowNodeNameEmpty,
                xml,
                elementNodeNameStartStep.cursor,
                ElementParser,
                steps
            )
        ) {
            return pushStep(
                steps,
                FxEventType.error,
                elementNodeNameStartStep.cursor,
                TAG_NAME_IS_EMPTY
            );
        }
        const selfClose = xml[cursor.offset] === "/";
        Object.assign(cursor, startTagEndCursor);
        pushStep(steps, FxEventType.startTagEnd, cursor);
        selfClose &&
            pushStep(steps, FxEventType.nodeEnd, cursor, [
                ElementParser,
                FxNodeCloseType.selfCloseing,
            ]);
    };
    for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
        const char = xml[cursor.offset];
        if (char === "<") {
            return pushStep(steps, FxEventType.error, cursor, TAG_HAS_MORE_BOUNDARY_CHAR);
        }
        if (REX_SPACE.test(char)) {
            if (
                !tagName &&
                !checkTagBoundaryNearSpace(
                    options,
                    "allowStartTagBoundaryNearSpace",
                    DEFAULT_PARSE_OPTIONS.allowStartTagBoundaryNearSpace,
                    xml,
                    cursor,
                    ElementParser,
                    "",
                    FxBoundaryPosition.left,
                    steps
                )
            ) {
                return pushStep(
                    steps,
                    FxEventType.error,
                    elementNodeNameStartStep.cursor,
                    BOUNDARY_HAS_SPACE
                );
            }
            needParseAttrs = true;
            break;
        }
        if (REX_SPACE.test(xml[cursor.offset + 1])) {
            tagName += char;
            steps.push(elementNodeNameStartStep);
            pushStep(steps, FxEventType.nodeNameEnd, cursor, tagName);
            needParseAttrs = true;
            moveCursor(cursor, 0, 1, 1);
            break;
        }
        let startTagEndCursor = ElementParser.checkAttrsEnd(xml, cursor, options);
        if (startTagEndCursor) {
            fireStartTagEnd(startTagEndCursor);
            break;
        } else {
            const nextCursor = moveCursor(
                {
                    ...cursor,
                },
                0,
                1,
                1
            );
            startTagEndCursor = ElementParser.checkAttrsEnd(xml, nextCursor, options);
            if (startTagEndCursor) {
                tagName += char;
                steps.push(elementNodeNameStartStep);
                pushStep(steps, FxEventType.nodeNameEnd, cursor, tagName);
                fireStartTagEnd(startTagEndCursor);
                moveCursor(cursor, 0, 1, 1);
                break;
            }
        }
        tagName += char;
    }
    let attrSteps: FxTryStep[];
    let attrEndCursor = {
        ...cursor,
    };
    if (needParseAttrs) {
        attrSteps = tryParseAttrs(xml, attrEndCursor, ElementParser, options);
        if (!tagName && attrSteps.length) {
            // startTag开头位置出现空白字符，导致直接开始解析属性，此时需要判断第一个属性是否属于tagName
            let hasEqual;
            let hasBrundary;
            const firstAttrSteps = filterFirstAttrSteps(attrSteps, (step: FxTryStep): boolean => {
                hasEqual = hasEqual || step.step === FxEventType.attrEqual;
                hasBrundary = hasBrundary || step.step === FxEventType.attrLeftBoundary;
                return (
                    step.step === FxEventType.nodeNameStart ||
                    step.step === FxEventType.nodeNameEnd ||
                    step.step === FxEventType.nodeEnd
                );
            });
            if (firstAttrSteps.length === 3) {
                const [
                    [, attrNameStartStep],
                    [, attrNameEndStep],
                    [attrEndStepIndex],
                ] = firstAttrSteps;
                const attrName = attrNameEndStep.data as string;
                if (attrName && !hasBrundary && !hasEqual) {
                    // 将第一个属性（其实是tagName）删掉
                    attrSteps.splice(0, attrEndStepIndex + 1);
                    tagName = attrName;
                    pushStep(steps, FxEventType.nodeNameStart, attrNameStartStep.cursor);
                    pushStep(steps, FxEventType.nodeNameEnd, attrNameEndStep.cursor, tagName);
                    Object.assign(cursor, attrNameEndStep.cursor);
                    moveCursor(cursor, 0, 1, 1);
                }
            }
        }
    }
    if (
        !tagName.trim() &&
        !checkCommonOption(
            options,
            "allowNodeNameEmpty",
            DEFAULT_PARSE_OPTIONS.allowNodeNameEmpty,
            xml,
            elementNodeNameStartStep.cursor,
            ElementParser,
            steps
        )
    ) {
        return pushStep(
            steps,
            FxEventType.error,
            elementNodeNameStartStep.cursor,
            TAG_NAME_IS_EMPTY
        );
    }
    if (needParseAttrs) {
        if (attrSteps.length) {
            pushStep(steps, FxEventType.attrsStart, attrSteps[0].cursor);
            steps = steps.concat(attrSteps);
            Object.assign(cursor, attrEndCursor);
            pushStep(steps, FxEventType.attrsEnd, cursor);
            moveCursor(cursor, 0, 1, 1);
        }
        if (cursor.offset < xmlLength - 1) {
            if (
                REX_SPACE.test(xml[cursor.offset]) &&
                !checkTagBoundaryNearSpace(
                    options,
                    "allowStartTagBoundaryNearSpace",
                    DEFAULT_PARSE_OPTIONS.allowStartTagBoundaryNearSpace,
                    xml,
                    cursor,
                    ElementParser,
                    tagName,
                    FxBoundaryPosition.right,
                    steps
                )
            ) {
                return pushStep(steps, FxEventType.error, cursor, BOUNDARY_HAS_SPACE);
            }
            for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
                const startTagEndCursor = ElementParser.checkAttrsEnd(xml, cursor, options);
                if (startTagEndCursor) {
                    fireStartTagEnd(startTagEndCursor);
                    moveCursor(cursor, 0, 1, 1);
                    break;
                }
                const brType = currentIsLineBreak(xml, cursor.offset);
                if (brType != -1) {
                    moveCursor(cursor, 1, -cursor.column + 1, !brType ? 0 : 1);
                }
            }
        }
    }
    return steps;
};

export const tryParseElementEndTag = (
    xml: string,
    cursor: FxCursorPosition,
    options: FxParseOptions,
    endTagStartCursor?: FxCursorPosition
): FxTryStep[] => {
    let steps: FxTryStep[] = [];
    const xmlLength = xml.length;
    endTagStartCursor = endTagStartCursor || ignoreSpaceIsHeadTail(xml, cursor, "<", "/");
    pushStep(steps, FxEventType.endTagStart, cursor);
    const nextCursor: FxCursorPosition = {
        lineNumber: cursor.lineNumber,
        column: cursor.column + 1,
        offset: cursor.offset + 1,
    };
    if (!equalCursor(nextCursor, endTagStartCursor)) {
        if (
            !checkTagBoundaryNearSpace(
                options,
                "allowEndTagBoundaryNearSpace",
                DEFAULT_PARSE_OPTIONS.allowEndTagBoundaryNearSpace,
                xml,
                cursor,
                ElementParser,
                "",
                FxBoundaryPosition.left,
                steps
            )
        ) {
            return pushStep(steps, FxEventType.error, cursor, BOUNDARY_HAS_SPACE);
        }
    }
    Object.assign(cursor, endTagStartCursor);
    // 将光标挪移到“/”的后一个字符
    moveCursor(cursor, 0, 1, 1);
    let closeRight;
    let tagName = "";
    let endTagEndCursorStep: FxTryStep;
    let nodeNameStartStep: FxTryStep;
    let nodeNameEndStep: FxTryStep;
    for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
        const char = xml[cursor.offset];
        if (REX_SPACE.test(char)) {
            if (
                !checkTagBoundaryNearSpace(
                    options,
                    "allowEndTagBoundaryNearSpace",
                    DEFAULT_PARSE_OPTIONS.allowEndTagBoundaryNearSpace,
                    xml,
                    cursor,
                    ElementParser,
                    tagName,
                    FxBoundaryPosition.right,
                    steps
                )
            ) {
                return pushStep(steps, FxEventType.error, cursor, TAG_NAME_NEAR_SPACE);
            }
            const brType = currentIsLineBreak(xml, cursor.offset);
            if (brType != -1) {
                moveCursor(cursor, 1, -cursor.column, !brType ? 0 : 1);
            }
            if (tagName) {
                tagName += char;
            }
            continue;
        }
        if (char !== ">") {
            if (!nodeNameStartStep) {
                nodeNameStartStep = createStep(FxEventType.nodeNameStart, cursor);
            }
            tagName += char;
            if (xml[cursor.offset + 1] === ">") {
                nodeNameEndStep = createStep(FxEventType.nodeNameEnd, cursor, tagName.trim());
            }
        } else {
            tagName = tagName.trim();
            endTagEndCursorStep = createStep(FxEventType.endTagEnd, cursor, tagName);
            closeRight = true;
            break;
        }
    }
    nodeNameStartStep && steps.push(nodeNameStartStep);
    nodeNameEndStep && steps.push(nodeNameEndStep);
    if (closeRight) {
        steps.push(endTagEndCursorStep);
        pushStep(steps, FxEventType.nodeEnd, cursor, [ElementParser, FxNodeCloseType.fullClosed]);
        moveCursor(cursor, 0, 1, 1);
    }
    return steps;
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
                context.options,
                endTagStartCursor
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
