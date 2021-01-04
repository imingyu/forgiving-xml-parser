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
import { AttrParser, tryParseAttrs, serializeNodeAttrs } from "./attr";
import { boundStepsToContext } from "../option";
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
    let elementAttrsStartStep: FxTryStep;
    let needParseAttrs;
    let tagName = "";
    const fireStartTagEnd = (startTagEndCursor: FxCursorPosition) => {
        if (
            !tagName &&
            !checkOptionAllow(
                options,
                "allowNodeNameEmpty",
                DEFAULT_PARSE_OPTIONS.allowNodeNameEmpty,
                tagName,
                xml,
                elementNodeNameStartStep.cursor,
                ElementParser
            )
        ) {
            pushStep(steps, FxEventType.error, elementNodeNameStartStep.cursor, TAG_NAME_IS_EMPTY);
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
            needParseAttrs = true;
            elementAttrsStartStep = createStep(FxEventType.attrsStart, cursor);
            const brType = currentIsLineBreak(xml, cursor.offset);
            if (brType != -1) {
                moveCursor(cursor, 1, -cursor.column + 1, !brType ? 0 : 1);
            } else {
                moveCursor(cursor, 0, 1, 1);
            }
            break;
        }
        if (REX_SPACE.test(xml[cursor.offset + 1])) {
            tagName += char;
            steps.push(elementNodeNameStartStep);
            pushStep(steps, FxEventType.nodeNameEnd, cursor, tagName);
            needParseAttrs = true;
            moveCursor(cursor, 0, 1, 1);
            pushStep(steps, FxEventType.attrsStart, cursor);
            const brType = currentIsLineBreak(xml, cursor.offset);
            if (brType != -1) {
                moveCursor(cursor, 1, -cursor.column + 1, !brType ? 0 : 1);
            }
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
                moveCursor(cursor, 0, 1, 1);
                fireStartTagEnd(startTagEndCursor);
                break;
            }
        }
        tagName += char;
    }
    if (needParseAttrs) {
        const attrSteps = tryParseAttrs(xml, cursor, ElementParser, options);
        if (!tagName) {
            // startTag开头位置出现空白字符，导致直接开始解析属性，此时需要判断第一个属性是否属于tagName
            let firstAttrNodeEndIndex;
            const attrs = boundStepsToContext(
                attrSteps,
                null,
                (stepItem: FxTryStep, stepItemIndex: number): boolean => {
                    firstAttrNodeEndIndex = stepItemIndex;
                    return (
                        stepItem.step === FxEventType.nodeEnd ||
                        stepItem.step === FxEventType.startTagEnd
                    );
                }
            );
            // 判断第一个属性仅存在名称
            if (attrs[0] && !attrs[0].equalCount && !attrs[0].content) {
                const attrName = attrs[0].name;
                // 检测option
                if (
                    !checkOptionAllow(
                        options,
                        "allowStartTagBoundaryNearSpace",
                        DEFAULT_PARSE_OPTIONS.allowStartTagBoundaryNearSpace,
                        attrName,
                        xml,
                        elementNodeNameStartStep.cursor,
                        ElementParser,
                        attrName,
                        FxBoundaryPosition.left
                    )
                ) {
                    return pushStep(
                        steps,
                        FxEventType.error,
                        elementNodeNameStartStep.cursor,
                        BOUNDARY_HAS_SPACE
                    );
                }
                // 设置正确的tagName及插入nodeNameStart,nodeNameEnd
                const firstAttrSteps = attrSteps.splice(0, firstAttrNodeEndIndex + 1);
                const attrNameStartStep = firstAttrSteps.find(
                    (item) => item.step === FxEventType.nodeNameStart
                );
                const attrNameEndStep = firstAttrSteps[firstAttrSteps.length - 1];
                attrNameEndStep.data = attrName;
                tagName = attrName;
                Object.assign(elementNodeNameStartStep.cursor, attrNameStartStep.cursor);
                steps.push(elementNodeNameStartStep, attrNameEndStep);

                // 插入有效的attsStart，光标位置取nodeNameEnd的后一位
                Object.assign(elementAttrsStartStep.cursor, {
                    lineNumber: attrNameEndStep.cursor.lineNumber,
                    offset: attrNameEndStep.cursor.offset + 1,
                    column: attrNameEndStep.cursor.column + 1,
                });
                steps.push(elementAttrsStartStep);
            } else if (
                !checkOptionAllow(
                    options,
                    "allowNodeNameEmpty",
                    DEFAULT_PARSE_OPTIONS.allowNodeNameEmpty,
                    null,
                    xml,
                    elementNodeNameStartStep.cursor,
                    ElementParser
                )
            ) {
                return pushStep(
                    steps,
                    FxEventType.error,
                    elementNodeNameStartStep.cursor,
                    TAG_NAME_IS_EMPTY
                );
            }
        }
        steps = steps.concat(attrSteps);
        pushStep(steps, FxEventType.attrsEnd, cursor);
        if (cursor.offset < xmlLength - 1) {
            if (
                !checkOptionAllow(
                    options,
                    "allowStartTagBoundaryNearSpace",
                    DEFAULT_PARSE_OPTIONS.allowStartTagBoundaryNearSpace,
                    tagName,
                    xml,
                    cursor,
                    ElementParser,
                    tagName,
                    FxBoundaryPosition.right
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
            !checkOptionAllow(
                options,
                "allowEndTagBoundaryNearSpace",
                DEFAULT_PARSE_OPTIONS.allowEndTagBoundaryNearSpace,
                null,
                xml,
                nextCursor,
                ElementParser
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
                !checkOptionAllow(
                    options,
                    "allowEndTagBoundaryNearSpace",
                    DEFAULT_PARSE_OPTIONS.allowEndTagBoundaryNearSpace,
                    tagName,
                    xml,
                    cursor,
                    ElementParser,
                    tagName
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
        if (!nodeNameStartStep) {
            nodeNameStartStep = createStep(FxEventType.nodeNameStart, cursor);
        }
        tagName += char;
        nodeNameEndStep = createStep(FxEventType.nodeNameEnd, cursor, tagName.trim());
        const nextChar = xml[cursor.offset + 1];
        if (nextChar === ">") {
            moveCursor(cursor, 0, 1, 1);
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
