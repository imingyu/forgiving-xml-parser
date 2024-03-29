import { boundStepsToContext } from "../option";
import {
    ATTR_BOUNDARY_NOT_RIGHT,
    ATTR_CONTENT_HAS_BR,
    ATTR_EQUAL_NEAR_SPACE,
    ATTR_HAS_MORE_EQUAL,
    ATTR_MORE_LEFT_BOUNDARY,
    ATTR_NAME_IS_EMPTY,
    ATTR_UNEXPECTED_BOUNDARY,
} from "../message";
import { checkOptionAllow, computeOption, isTrueOption } from "../option";
import {
    FxAttrMoreEqualDisposal,
    FxAttrParseCallback,
    FxCursorPosition,
    FxEventType,
    FxNodeCloseType,
    FxNodeJSON,
    FxNodeNature,
    FxNodeAdapter,
    FxNodeType,
    FxParseAttrTarget,
    FxParseContext,
    FxParseOptions,
    FxTryStep,
    FxNodeSerializer,
    FxSerializeOptions,
} from "../types";
import {
    createFxError,
    currentIsLineBreak,
    equalCursor,
    findStrCursor,
    moveCursor,
    notSpaceCharCursor,
    pushStep,
    repeatString,
} from "../util";
import { DEFAULT_PARSE_OPTIONS, REX_SPACE } from "../var";
export const tryParseAttrs = (
    xml: string,
    cursor: FxCursorPosition,
    parentNodeParser: FxNodeAdapter,
    options?: FxParseOptions,
    attrCallback?: FxAttrParseCallback
): FxTryStep[] => {
    let steps: FxTryStep[] = [];
    const xmlLength = xml.length;
    for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
        const currentAttrSteps: FxTryStep[] = [];
        const res = tryParseAttr(xml, cursor, parentNodeParser, options, currentAttrSteps);
        steps = steps.concat(currentAttrSteps);
        if (res === "break" || (attrCallback && attrCallback(currentAttrSteps, steps))) {
            break;
        }
    }
    return steps;
};

const equalAttrBoundaryChar = (
    xml: string,
    cursor: FxCursorPosition,
    boundaryChar: string | RegExp
) => {
    if (!boundaryChar) {
        return false;
    }
    const str = xml.substr(cursor.offset);
    if (boundaryChar instanceof RegExp) {
        return boundaryChar.test(xml);
    }
    boundaryChar = boundaryChar || "";
    return str.substr(0, boundaryChar.length) === boundaryChar;
};

const getAttrBoundaryChar = (
    xml: string,
    boundaryCharMatch: string | RegExp,
    cursor: FxCursorPosition
): string => {
    let boundaryValue: string;
    const subXml = xml.substr(cursor.offset);
    if (boundaryCharMatch instanceof RegExp) {
        const arr = subXml.match(boundaryCharMatch);
        if (arr) {
            boundaryValue = arr[0];
        }
    } else {
        boundaryValue = subXml.substr(0, ((boundaryCharMatch as string) || "").length);
    }
    return boundaryValue;
};

// 解析单个属性，如果在attrEnd后即将遇到attrsEnd，则返回“break”
export const tryParseAttr = (
    xml: string,
    cursor: FxCursorPosition,
    parentNodeParser: FxNodeAdapter,
    options: FxParseOptions,
    steps: FxTryStep[]
) => {
    const xmlLength = xml.length;
    let content: string;
    let findTarget: FxParseAttrTarget; // 表示正在寻找某目标，而不是当前已经是某目标
    let leftBoundaryValue: string = "";
    let hasNodeContentStart;
    const clear = () => {
        leftBoundaryValue = content = findTarget = undefined;
    };
    const plusContent = (char: string) => {
        if (!content) {
            content = char;
            if (findTarget === FxParseAttrTarget.name) {
                pushStep(steps, FxEventType.nodeNameStart, cursor, FxNodeType.attr);
            } else if (findTarget === FxParseAttrTarget.content) {
                hasNodeContentStart = true;
                pushStep(steps, FxEventType.nodeContentStart, cursor);
            }
            return;
        }
        content += char;
    };
    const fireAttrEnd = (currentTargetEnd: boolean = false) => {
        if (currentTargetEnd && findTarget) {
            if (findTarget === FxParseAttrTarget.name) {
                pushStep(steps, FxEventType.nodeNameEnd, cursor, content);
            } else if (findTarget === FxParseAttrTarget.content && hasNodeContentStart) {
                pushStep(steps, FxEventType.nodeContentEnd, cursor, content);
            }
        }
        let closeType: FxNodeCloseType =
            findTarget === FxParseAttrTarget.name
                ? FxNodeCloseType.fullClosed
                : FxNodeCloseType.notClosed;
        if (findTarget === FxParseAttrTarget.content) {
            closeType = !leftBoundaryValue ? FxNodeCloseType.fullClosed : FxNodeCloseType.notClosed;
        }
        pushStep(steps, FxEventType.nodeEnd, cursor, [AttrParser, closeType]);
        clear();
    };
    let attrsEnd;
    const checkAttrEnd = (): boolean => {
        if (cursor.offset + 1 > xmlLength - 1) {
            return false;
        }
        const nextCursor = moveCursor(
            {
                ...cursor,
            },
            0,
            1,
            1
        );
        const nextValidCharCursor = notSpaceCharCursor(xml, nextCursor);
        if (!nextValidCharCursor) {
            fireAttrEnd(true);
            attrsEnd = true;
            return true;
        }
        if (findTarget === FxParseAttrTarget.name) {
            const nextValidChar = xml[nextValidCharCursor.offset];
            if (nextValidChar === "=") {
                if (
                    !equalCursor(nextCursor, nextValidCharCursor) &&
                    !checkOptionAllow(
                        options,
                        "allowNearAttrEqualSpace",
                        DEFAULT_PARSE_OPTIONS.allowNearAttrEqualSpace,
                        null,
                        xml,
                        nextCursor,
                        AttrParser
                    )
                ) {
                    throw createFxError(ATTR_EQUAL_NEAR_SPACE, nextCursor);
                }
                pushStep(steps, FxEventType.nodeNameEnd, cursor, content);
                content = undefined;
                findTarget = FxParseAttrTarget.equal;
                return false;
            }
            if (
                equalAttrBoundaryChar(
                    xml,
                    nextValidCharCursor,
                    parentNodeParser.attrLeftBoundaryChar
                )
            ) {
                fireAttrEnd(true);
                return true;
            }
            if (parentNodeParser.checkAttrsEnd(xml, nextValidCharCursor, options)) {
                fireAttrEnd(true);
                attrsEnd = true;
                return true;
            }
            if (REX_SPACE.test(xml[nextCursor.offset])) {
                fireAttrEnd(true);
                return true;
            }
            return false;
        }
        if (findTarget === FxParseAttrTarget.leftBoundary) {
            const nextValidChar = xml[nextValidCharCursor.offset];
            if (nextValidChar === "=") {
                const encounterAttrMoreEqual = computeOption(
                    options,
                    "encounterAttrMoreEqual",
                    DEFAULT_PARSE_OPTIONS.encounterAttrMoreEqual,
                    xml,
                    nextValidCharCursor,
                    AttrParser
                );
                if (encounterAttrMoreEqual === FxAttrMoreEqualDisposal.newAttr) {
                    fireAttrEnd();
                    return true;
                }
                return false;
            }
            // 如果当前正在寻找左边界，但是下个有效字符（非空白）不等于左边界符，则该attr结束
            const boundaryValue = getAttrBoundaryChar(
                xml,
                parentNodeParser.attrLeftBoundaryChar,
                nextValidCharCursor
            );
            if (!boundaryValue || boundaryValue !== nextValidChar) {
                fireAttrEnd();
                return true;
            }
        }
        if (findTarget === FxParseAttrTarget.content) {
            if (leftBoundaryValue) {
                const boundaryValue = getAttrBoundaryChar(
                    xml,
                    parentNodeParser.attrRightBoundaryChar,
                    nextValidCharCursor
                );
                if (
                    boundaryValue &&
                    (parentNodeParser.attrBoundaryCharNeedEqual
                        ? leftBoundaryValue === boundaryValue
                        : true) &&
                    hasNodeContentStart
                ) {
                    pushStep(steps, FxEventType.nodeContentEnd, cursor, content);
                }
            } else {
                attrsEnd = !!parentNodeParser.checkAttrsEnd(xml, nextValidCharCursor, options);
                if (REX_SPACE.test(xml[nextCursor.offset]) || attrsEnd) {
                    fireAttrEnd(true);
                    return true;
                }
            }
        }
        if (!findTarget && !!parentNodeParser.checkAttrsEnd(xml, nextValidCharCursor, options)) {
            attrsEnd = true;
            return true;
        }
    };
    const returnEnd = () => {
        return attrsEnd ? "break" : "";
    };
    const checkEqualNextSpace = () => {
        const nextCursor = moveCursor(
            {
                ...cursor,
            },
            0,
            1,
            1
        );
        if (
            REX_SPACE.test(xml[nextCursor.offset]) &&
            !checkOptionAllow(
                options,
                "allowNearAttrEqualSpace",
                DEFAULT_PARSE_OPTIONS.allowNearAttrEqualSpace,
                null,
                xml,
                nextCursor,
                AttrParser
            )
        ) {
            throw createFxError(ATTR_EQUAL_NEAR_SPACE, nextCursor);
        }
    };
    for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
        const char = xml[cursor.offset];
        if (REX_SPACE.test(char)) {
            if (leftBoundaryValue && findTarget === FxParseAttrTarget.content) {
                plusContent(char);
                const brType = currentIsLineBreak(xml, cursor.offset);
                if (brType !== -1) {
                    if (findTarget === FxParseAttrTarget.content) {
                        if (!isTrueOption("allowAttrContentHasBr", options)) {
                            throw createFxError(ATTR_CONTENT_HAS_BR, cursor);
                        }
                        plusContent(!brType ? char : char + xml[cursor.offset + 1]);
                    }
                    moveCursor(cursor, 1, -cursor.column, !brType ? 0 : 1);
                    continue;
                }
                if (checkAttrEnd()) {
                    return returnEnd();
                }
                continue;
            }
            const brType = currentIsLineBreak(xml, cursor.offset);
            if (brType !== -1) {
                moveCursor(cursor, 1, -cursor.column, !brType ? 0 : 1);
            }
            continue;
        }
        if (char === "=") {
            if (!findTarget) {
                if (
                    !checkOptionAllow(
                        options,
                        "allowNodeNameEmpty",
                        DEFAULT_PARSE_OPTIONS.allowNodeNameEmpty,
                        null,
                        xml,
                        cursor,
                        AttrParser
                    )
                ) {
                    throw createFxError(ATTR_NAME_IS_EMPTY, cursor);
                }
                pushStep(steps, FxEventType.nodeStart, cursor, AttrParser);
                pushStep(steps, FxEventType.attrEqual, cursor);
                findTarget = FxParseAttrTarget.leftBoundary;
                checkEqualNextSpace();
                if (checkAttrEnd()) {
                    return returnEnd();
                }
                continue;
            }
            if (findTarget === FxParseAttrTarget.equal) {
                pushStep(steps, FxEventType.attrEqual, cursor);
                findTarget = FxParseAttrTarget.leftBoundary;
                checkEqualNextSpace();
                if (checkAttrEnd()) {
                    return returnEnd();
                }
                continue;
            }
            if (findTarget === FxParseAttrTarget.leftBoundary) {
                const encounterAttrMoreEqual = computeOption(
                    options,
                    "encounterAttrMoreEqual",
                    DEFAULT_PARSE_OPTIONS.encounterAttrMoreEqual,
                    xml,
                    cursor,
                    AttrParser
                );
                if (encounterAttrMoreEqual === FxAttrMoreEqualDisposal.throwError) {
                    throw createFxError(ATTR_HAS_MORE_EQUAL, cursor);
                }
                pushStep(steps, FxEventType.attrEqual, cursor);
                checkEqualNextSpace();
                if (checkAttrEnd()) {
                    return returnEnd();
                }
                continue;
            }
            if (findTarget === FxParseAttrTarget.content && leftBoundaryValue) {
                plusContent(char);
                if (checkAttrEnd()) {
                    return returnEnd();
                }
                continue;
            }
            continue;
        }
        const boundaryCharMatch =
            findTarget === FxParseAttrTarget.content
                ? parentNodeParser.attrRightBoundaryChar
                : parentNodeParser.attrLeftBoundaryChar;
        const boundaryValue = getAttrBoundaryChar(xml, boundaryCharMatch, cursor);
        if (boundaryValue) {
            if (!findTarget) {
                if (
                    !checkOptionAllow(
                        options,
                        "allowNodeNameEmpty",
                        DEFAULT_PARSE_OPTIONS.allowNodeNameEmpty,
                        null,
                        xml,
                        cursor,
                        AttrParser
                    )
                ) {
                    throw createFxError(ATTR_NAME_IS_EMPTY, cursor);
                }
                pushStep(steps, FxEventType.nodeStart, cursor, AttrParser);
                leftBoundaryValue = boundaryValue;
                pushStep(steps, FxEventType.attrLeftBoundary, cursor, boundaryValue);
                moveCursor(cursor, 0, boundaryValue.length - 1, boundaryValue.length - 1);
                content = "";
                findTarget = FxParseAttrTarget.content;
                if (checkAttrEnd()) {
                    return returnEnd();
                }
                continue;
            }
            if (findTarget === FxParseAttrTarget.leftBoundary) {
                findTarget = FxParseAttrTarget.content;
                content = "";
                leftBoundaryValue = boundaryValue;
                pushStep(steps, FxEventType.attrLeftBoundary, cursor, boundaryValue);
                moveCursor(cursor, 0, boundaryValue.length - 1, boundaryValue.length - 1);
                if (checkAttrEnd()) {
                    return returnEnd();
                }
                continue;
            }
            if (!leftBoundaryValue && findTarget === FxParseAttrTarget.content) {
                throw createFxError(ATTR_UNEXPECTED_BOUNDARY, cursor);
            }
            if (
                leftBoundaryValue &&
                findTarget === FxParseAttrTarget.content &&
                xml[cursor.offset - 1] === "\\"
            ) {
                // 存在转义“\"”的情况
                const another = findStrCursor(xml, cursor, '\\"');
                if (another[0]) {
                    plusContent(xml.substring(cursor.offset, another[2].offset + 1));
                    moveCursor(another[2], 0, 1, 1);
                    Object.assign(cursor, another[2]);
                    if (checkAttrEnd()) {
                        return returnEnd();
                    }
                    continue;
                }
                throw createFxError(ATTR_MORE_LEFT_BOUNDARY, cursor);
            }
            if (
                leftBoundaryValue &&
                findTarget === FxParseAttrTarget.content &&
                (parentNodeParser.attrBoundaryCharNeedEqual
                    ? leftBoundaryValue === boundaryValue
                    : true)
            ) {
                pushStep(steps, FxEventType.attrRightBoundary, cursor, boundaryValue);
                moveCursor(cursor, 0, boundaryValue.length - 1, boundaryValue.length - 1);
                pushStep(steps, FxEventType.nodeEnd, cursor, [
                    AttrParser,
                    FxNodeCloseType.fullClosed,
                ]);
                clear();
                checkAttrEnd();
                return returnEnd();
            }
            moveCursor(cursor, 0, boundaryValue.length - 1, boundaryValue.length - 1);
            plusContent(boundaryValue);
            if (checkAttrEnd()) {
                return returnEnd();
            }
            continue;
        }
        if (findTarget === FxParseAttrTarget.name || findTarget === FxParseAttrTarget.content) {
            plusContent(char);
            if (checkAttrEnd()) {
                return returnEnd();
            }
            continue;
        }
        if (findTarget === FxParseAttrTarget.leftBoundary) {
            findTarget = FxParseAttrTarget.content;
            plusContent(char);
            if (checkAttrEnd()) {
                return returnEnd();
            }
            continue;
        }
        if (!findTarget) {
            if (parentNodeParser.checkAttrsEnd(xml, cursor, options)) {
                attrsEnd = true;
                return returnEnd();
            }
            findTarget = FxParseAttrTarget.name;
            pushStep(steps, FxEventType.nodeStart, cursor, AttrParser);
            plusContent(char);
            if (checkAttrEnd()) {
                return returnEnd();
            }
        }
    }
    if (!attrsEnd && findTarget) {
        if (findTarget === FxParseAttrTarget.name) {
            pushStep(steps, FxEventType.nodeNameEnd, cursor, content);
            pushStep(steps, FxEventType.nodeEnd, cursor, [AttrParser, FxNodeCloseType.fullClosed]);
        } else if (findTarget === FxParseAttrTarget.equal) {
            pushStep(steps, FxEventType.nodeEnd, steps[steps.length - 1].cursor, [
                AttrParser,
                FxNodeCloseType.fullClosed,
            ]);
        } else if (findTarget === FxParseAttrTarget.leftBoundary) {
            pushStep(steps, FxEventType.nodeEnd, steps[steps.length - 1].cursor, [
                AttrParser,
                FxNodeCloseType.notClosed,
            ]);
        } else if (findTarget === FxParseAttrTarget.content) {
            // 检测是否有属性只写了左边界符，忘记写右边界符的情况
            const contentStartCursor = steps[steps.length - 1].cursor;
            const testCursor = {
                ...contentStartCursor,
            };
            let prevCursor = {
                ...contentStartCursor,
            };
            for (
                let len = contentStartCursor.offset + content.length;
                testCursor.offset < len;
                moveCursor(testCursor, 0, 1, 1)
            ) {
                if (parentNodeParser.checkAttrsEnd(xml, testCursor, options)) {
                    throw createFxError(ATTR_BOUNDARY_NOT_RIGHT, prevCursor);
                }
                prevCursor = {
                    ...testCursor,
                };
                const char = xml[testCursor.offset];
                if (REX_SPACE.test(char)) {
                    const brType = currentIsLineBreak(xml, testCursor.offset);
                    if (brType !== -1) {
                        moveCursor(testCursor, 1, -testCursor.column, !brType ? 0 : 1);
                    }
                    continue;
                }
            }
            hasNodeContentStart && pushStep(steps, FxEventType.nodeContentEnd, cursor, content);
            pushStep(steps, FxEventType.nodeEnd, steps[steps.length - 1].cursor, [
                AttrParser,
                leftBoundaryValue ? FxNodeCloseType.notClosed : FxNodeCloseType.fullClosed,
            ]);
        }
        attrsEnd = true;
    }
    if (attrsEnd) {
        return "break";
    }
};

export const AttrParser: FxNodeAdapter = {
    nodeNature: FxNodeNature.alone,
    nodeType: FxNodeType.attr,
    parseMatch: "",
    parse: (context: FxParseContext, parentNodeParser?: FxNodeAdapter) => {
        const steps = tryParseAttrs(context.xml, context, parentNodeParser, context.options);
        boundStepsToContext(steps, context);
    },
    serializeMatch(currentNode: FxNodeJSON): boolean {
        return currentNode.type === FxNodeType.attr;
    },
    serialize(attr: FxNodeJSON): string {
        let [leftBoundary, rightBoundary] = Array.isArray(attr.boundaryChar)
            ? attr.boundaryChar
            : [attr.boundaryChar || "", attr.boundaryChar || ""];
        rightBoundary = rightBoundary || leftBoundary;
        return `${attr.name || ""}${repeatString("=", attr.equalCount)}${leftBoundary}${
            attr.content || ""
        }${!attr.closeType || attr.closeType === FxNodeCloseType.fullClosed ? rightBoundary : ""}`;
    },
};

export const serializeNodeAttrs = (
    node: FxNodeJSON,
    rootNodes: FxNodeJSON[],
    rootSerializer: FxNodeSerializer,
    options: FxSerializeOptions
): string => {
    if (node.attrs && node.attrs.length) {
        return (
            " " +
            node.attrs
                .map((attr) => {
                    let attrStr = AttrParser.serialize(
                        attr,
                        node.attrs,
                        rootNodes,
                        rootSerializer,
                        options,
                        node
                    );
                    if (typeof options.nodeSerializeHandler === "function") {
                        attrStr =
                            options.nodeSerializeHandler(
                                attr,
                                node.attrs,
                                rootNodes,
                                rootSerializer,
                                node,
                                AttrParser,
                                attrStr
                            ) || attrStr;
                    }
                    return attrStr;
                })
                .join(" ")
        );
    }
    return "";
};
