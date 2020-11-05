import {
    LxCursorPosition,
    LxEventType,
    LxNodeJSON,
    LxNodeNature,
    LxNodeParser,
    LxNodeSerializer,
    LxNodeType,
    LxParseContext,
    LxParseOptions,
    LxSerializeOptions,
    LxTryStep,
} from "../types";
import {
    checkElementEndTagStart,
    createStep,
    currentIsLineBreak,
    equalCursor,
    getEndCharCursor,
    moveCursor,
    pushStep,
    repeatString,
} from "../util";
import {
    BOUNDARY_HAS_SPACE,
    TAG_HAS_MORE_BOUNDARY_CHAR,
    TAG_NAME_NEAR_SPACE,
    TAG_NOT_CLOSE,
} from "../message";
import { tryParseElementAttrs } from "./attr";
import { boundStepsToContext } from "../init";
import { DEFAULT_PARSE_OPTIONS, REX_SPACE } from "../var";
import { checkOptionAllow } from "../option";
export const trySelfClose = (
    xml: string,
    cursor: LxCursorPosition,
    steps: LxTryStep[],
    tagName: string
) => {
    const char = xml[cursor.offset];
    if (xml[cursor.offset + 1] === "/" && xml[cursor.offset + 2] === ">") {
        tagName += char;
        pushStep(steps, LxEventType.nodeNameEnd, cursor, tagName);
        pushStep(steps, LxEventType.attrsEnd, cursor);
        moveCursor(cursor, 0, 2, 2);
        pushStep(steps, LxEventType.startTagEnd, cursor);
        pushStep(steps, LxEventType.nodeEnd, cursor, [
            LxNodeType.element,
            true,
        ]);
        return true;
    }
};
export const tryParseStartTag = (
    xml: string,
    cursor: LxCursorPosition,
    options: LxParseOptions
) => {
    let steps: LxTryStep[] = [];
    const xmlLength = xml.length;
    pushStep(steps, LxEventType.nodeStart, cursor, [
        LxNodeType.element,
        LxNodeNature.children,
    ]);
    pushStep(steps, LxEventType.startTagStart, cursor);
    moveCursor(cursor, 0, 1, 1);
    const elementNodeNameStartStep: LxTryStep = createStep(
        LxEventType.nodeNameStart,
        cursor
    );
    let elementAttrsStartStep: LxTryStep;
    let startTagCloseRight;
    let hasError;
    let needParseAttrs;
    let tagName = "";
    for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
        const char = xml[cursor.offset];
        if (char === "<") {
            pushStep(
                steps,
                LxEventType.error,
                cursor,
                TAG_HAS_MORE_BOUNDARY_CHAR
            );
            hasError = true;
            break;
        }
        if (REX_SPACE.test(char)) {
            needParseAttrs = true;
            elementAttrsStartStep = createStep(LxEventType.attrsStart, cursor);
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
            pushStep(steps, LxEventType.nodeNameEnd, cursor, tagName);
            needParseAttrs = true;
            moveCursor(cursor, 0, 1, 1);
            pushStep(steps, LxEventType.attrsStart, cursor);
            const brType = currentIsLineBreak(xml, cursor.offset);
            if (brType != -1) {
                moveCursor(cursor, 1, -cursor.column + 1, !brType ? 0 : 1);
            }
            break;
        }
        const selfClose =
            xml[cursor.offset + 1] === "/" && xml[cursor.offset + 2] === ">";
        if (xml[cursor.offset + 1] === ">" || selfClose) {
            steps.push(elementNodeNameStartStep);
            tagName += char;
            pushStep(steps, LxEventType.nodeNameEnd, cursor, tagName);
            moveCursor(cursor, 0, selfClose ? 2 : 1, selfClose ? 2 : 1);
            pushStep(steps, LxEventType.startTagEnd, cursor);
            selfClose &&
                pushStep(steps, LxEventType.nodeEnd, cursor, [
                    LxNodeType.element,
                    true,
                ]);
            startTagCloseRight = true;
            break;
        }
        tagName += char;
    }
    if (needParseAttrs) {
        const attrSteps = tryParseElementAttrs(
            xml,
            cursor,
            LxNodeType.element,
            options
        );
        if (!tagName) {
            // startTag开头位置出现空白字符，导致直接开始解析属性，此时需要判断第一个属性是否属于tagName
            let firstAttrNodeEndIndex;
            const attrs = boundStepsToContext(
                attrSteps,
                null,
                (stepItem: LxTryStep, stepItemIndex: number): boolean => {
                    firstAttrNodeEndIndex = stepItemIndex;
                    return (
                        stepItem.step === LxEventType.nodeEnd ||
                        stepItem.step === LxEventType.startTagEnd
                    );
                }
            );
            // 判断第一个属性仅存在名称
            if (
                attrs[0] &&
                attrs[0].type === LxNodeType.attr &&
                !attrs[0].equalCount &&
                !attrs[0].content
            ) {
                const attrName = attrs[0].name;
                // 检测option
                if (
                    !checkOptionAllow(
                        options,
                        "allowStartTagLeftBoundarySpace",
                        DEFAULT_PARSE_OPTIONS.allowStartTagLeftBoundarySpace,
                        attrName,
                        elementNodeNameStartStep.cursor
                    )
                ) {
                    pushStep(
                        steps,
                        LxEventType.error,
                        elementNodeNameStartStep.cursor,
                        BOUNDARY_HAS_SPACE
                    );
                }
                // 设置正确的tagName及插入nodeNameStart,nodeNameEnd
                const firstAttrSteps = attrSteps.splice(
                    0,
                    firstAttrNodeEndIndex + 1
                );
                const attrNameStartStep = firstAttrSteps.find(
                    (item) => item.step === LxEventType.nodeNameStart
                );
                const attrNameEndStep =
                    firstAttrSteps[firstAttrSteps.length - 1];
                attrNameEndStep.data = attrName;
                Object.assign(
                    elementNodeNameStartStep.cursor,
                    attrNameStartStep.cursor
                );
                steps.push(elementNodeNameStartStep, attrNameEndStep);

                // 插入有效的attsStart，光标位置取nodeNameEnd的后一位
                Object.assign(elementAttrsStartStep.cursor, {
                    lineNumber: attrNameEndStep.cursor.lineNumber,
                    offset: attrNameEndStep.cursor.offset + 1,
                    column: attrNameEndStep.cursor.column + 1,
                });
                steps.push(elementAttrsStartStep);
                steps = steps.concat(attrSteps);
            }
        } else {
            steps = steps.concat(attrSteps);
        }
        startTagCloseRight = true;
    }
    if (!hasError && !startTagCloseRight) {
        pushStep(steps, LxEventType.error, cursor, TAG_NOT_CLOSE);
        pushStep(steps, LxEventType.nodeNameEnd, cursor, tagName);
        pushStep(steps, LxEventType.nodeEnd, cursor, [
            LxNodeType.element,
            false,
            false,
        ]);
    }
    return steps;
};

export const tryParseEndTag = (
    xml: string,
    cursor: LxCursorPosition,
    options: LxParseOptions,
    endTagStartCursor?: LxCursorPosition
): LxTryStep[] => {
    let steps: LxTryStep[] = [];
    const xmlLength = xml.length;
    endTagStartCursor =
        endTagStartCursor ||
        checkElementEndTagStart(xml, {
            ...cursor,
        });
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
                "allowEndTagLeftBoundarySpace",
                DEFAULT_PARSE_OPTIONS.allowEndTagLeftBoundarySpace,
                null,
                nextCursor
            )
        ) {
            pushStep(steps, LxEventType.error, cursor, BOUNDARY_HAS_SPACE);
        }
    }
    Object.assign(cursor, endTagStartCursor);
    // 将光标挪移到“/”的后一个字符
    moveCursor(cursor, 0, 1, 1);
    let closeRight;
    let tagName = "";
    let endTagNameStartNearSpaceCursor: LxCursorPosition;
    let endTagNameEndNearSpaceCursor: LxCursorPosition;
    let endTagEndCursorStep: LxTryStep;
    for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
        const char = xml[cursor.offset];
        if (!tagName && REX_SPACE.test(char)) {
            if (!endTagNameStartNearSpaceCursor) {
                endTagNameStartNearSpaceCursor = cursor;
            }
            const brType = currentIsLineBreak(xml, cursor.offset);
            if (brType != -1) {
                moveCursor(cursor, 1, -cursor.column, !brType ? 0 : 1);
            }
            continue;
        }
        tagName += char;
        if (REX_SPACE.test(char)) {
            if (!endTagNameEndNearSpaceCursor) {
                endTagNameEndNearSpaceCursor = cursor;
            }
        }
        const nextChar = xml[cursor.offset + 1];
        if (REX_SPACE.test(nextChar) || nextChar === ">") {
            const endCursor = getEndCharCursor(
                xml,
                {
                    lineNumber: cursor.lineNumber,
                    column: cursor.column + 1,
                    offset: cursor.offset + 1,
                },
                ">"
            );
            if (endCursor) {
                // TODO: tagName equal
                Object.assign(cursor, endCursor);
                endTagEndCursorStep = {
                    step: LxEventType.endTagEnd,
                    cursor: {
                        ...cursor,
                    },
                    data: tagName,
                };
                closeRight = true;
                break;
            }
        }
    }
    if (
        endTagNameStartNearSpaceCursor &&
        !checkOptionAllow(
            options,
            "allowEndTagNameNearSpace",
            DEFAULT_PARSE_OPTIONS.allowEndTagNameNearSpace,
            tagName,
            endTagNameStartNearSpaceCursor
        )
    ) {
        pushStep(
            steps,
            LxEventType.error,
            endTagNameStartNearSpaceCursor,
            TAG_NAME_NEAR_SPACE
        );
    }
    if (
        endTagNameEndNearSpaceCursor &&
        !checkOptionAllow(
            options,
            "allowEndTagNameNearSpace",
            DEFAULT_PARSE_OPTIONS.allowEndTagNameNearSpace,
            tagName,
            endTagNameEndNearSpaceCursor
        )
    ) {
        pushStep(
            steps,
            LxEventType.error,
            endTagNameEndNearSpaceCursor,
            TAG_NAME_NEAR_SPACE
        );
    }
    if (closeRight) {
        steps.push(endTagEndCursorStep);
        pushStep(steps, LxEventType.nodeEnd, cursor, LxNodeType.element);
    } else {
        // TODO: 适配allowNodeNotClose
        pushStep(steps, LxEventType.startTagEnd, cursor, tagName);
        pushStep(steps, LxEventType.nodeEnd, cursor, [
            LxNodeType.element,
            false,
            false,
        ]);
    }
    return steps;
};

export const ElementParser: LxNodeParser = {
    nodeNature: LxNodeNature.children,
    parseMatch: /<\s*\/|</,
    parse(context: LxParseContext) {
        let steps: LxTryStep[];
        const endTagStartCursor = checkElementEndTagStart(context.xml, {
            lineNumber: context.lineNumber,
            column: context.column,
            offset: context.offset,
        });
        if (endTagStartCursor) {
            // 解析endTag
            steps = tryParseEndTag(
                context.xml,
                {
                    lineNumber: context.lineNumber,
                    column: context.column,
                    offset: context.offset,
                },
                context.options,
                endTagStartCursor
            );
        } else {
            steps = tryParseStartTag(
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
        return node.type === LxNodeType.element;
    },
    serialize(
        node: LxNodeJSON,
        brotherNodes: LxNodeJSON[],
        rootNodes: LxNodeJSON[],
        rootSerializer: LxNodeSerializer,
        options: LxSerializeOptions
    ): string {
        let res = "<";
        if (node.name) {
            res += node.name;
        }
        if (node.attrs && node.attrs.length) {
            node.attrs.forEach((attr) => {
                res += ` ${attr.name || ""}${repeatString(
                    "=",
                    attr.equalCount
                )}${attr.boundaryChar || ""}${attr.content || ""}${
                    attr.boundaryChar || ""
                }`;
            });
        }
        if (node.selfcloseing) {
            res += " />";
            return res;
        }
        res += ">";
        if (node.children && node.children.length) {
            res += rootSerializer(node.children, options);
        }
        if (node.closed) {
            res += `</${node.name || ""}>`;
        }
        return res;
    },
};
