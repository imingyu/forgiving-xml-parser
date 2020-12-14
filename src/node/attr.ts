import { boundStepsToContext } from "../option";
import {
    ATTR_CONTENT_HAS_BR,
    ATTR_EQUAL_NEAR_SPACE,
    ATTR_HAS_MORE_EQUAL,
    ATTR_NAME_IS_EMPTY,
} from "../message";
import { checkOptionAllow, computeOption, isTrueOption } from "../option";
import {
    AttrMoreEqualDisposal,
    LxAttrParseCallback,
    LxCursorPosition,
    LxEventType,
    LxNodeCloseType,
    LxNodeJSON,
    LxNodeNature,
    LxNodeParser,
    LxNodeType,
    LxParseAttrTarget,
    LxParseContext,
    LxParseOptions,
    LxTryStep,
} from "../types";
import {
    createLxError,
    currentIsLineBreak,
    equalCursor,
    ignoreSpaceFindCharCursor,
    moveCursor,
    notSpaceCharCursor,
    pushStep,
    repeatString,
} from "../util";
import { DEFAULT_PARSE_OPTIONS, REX_SPACE } from "../var";
const checkAttrsEnd = (xml: string, cursor: LxCursorPosition): number => {
    const nextChar = xml[cursor.offset + 1];
    const nextChar2 = xml[cursor.offset + 2];
    if (nextChar === ">") {
        return 2;
    }
    if (nextChar === "/" && nextChar2 === ">") {
        return 3;
    }
    return 0;
};
const checkAttrNameEnd = (xml: string, cursor: LxCursorPosition): number => {
    const nextChar = xml[cursor.offset + 1];
    if (nextChar === "=") {
        return 1;
    }

    if (nextChar === '"' || nextChar === "'") {
        return 2;
    }
    const res = checkAttrsEnd(xml, cursor);
    if (res) {
        return res;
    }
    if (REX_SPACE.test(nextChar)) {
        let offset = cursor.offset;
        let len = xml.length;
        let hasCharOffset;
        let findChar;
        while (offset < len) {
            findChar = xml[offset];
            if (!REX_SPACE.test(findChar)) {
                hasCharOffset = offset;
                break;
            }
        }
        if (hasCharOffset) {
            if (findChar !== "=" && findChar !== ">" && findChar !== "/") {
                return 2;
            }
            return checkAttrNameEnd(xml, {
                ...cursor,
                offset: hasCharOffset - 1,
            });
        }
    }
    return 0;
};
export const tryParseAttrs = (
    xml: string,
    cursor: LxCursorPosition,
    parentNodeParser: LxNodeParser,
    options?: LxParseOptions,
    attrCallback?: LxAttrParseCallback
): LxTryStep[] => {
    let steps: LxTryStep[] = [];
    const xmlLength = xml.length;
    for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
        const currentAttrSteps: LxTryStep[] = [];
        const res = tryParseAttr(
            xml,
            cursor,
            parentNodeParser,
            options,
            currentAttrSteps
        );
        steps = steps.concat(currentAttrSteps);
        if (
            res === "break" ||
            (attrCallback && attrCallback(currentAttrSteps, steps))
        ) {
            return steps;
        }
    }
    return steps;
};

const equalAttrBoundaryChar = (
    xml: string,
    cursor: LxCursorPosition,
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
    cursor: LxCursorPosition
): string => {
    let boundaryValue: string;
    const subXml = xml.substr(cursor.offset);
    if (boundaryCharMatch instanceof RegExp) {
        const arr = subXml.match(boundaryCharMatch);
        if (arr) {
            boundaryValue = arr[0];
        }
    } else {
        boundaryValue = subXml.substr(
            0,
            ((boundaryCharMatch as string) || "").length
        );
    }
    return boundaryValue;
};

// 解析单个属性，如果在attrEnd后即将遇到attrsEnd，则返回“break”
export const tryParseAttr = (
    xml: string,
    cursor: LxCursorPosition,
    parentNodeParser: LxNodeParser,
    options: LxParseOptions,
    steps: LxTryStep[]
) => {
    const xmlLength = xml.length;
    let content: string;
    let findTarget: LxParseAttrTarget; // 表示正在寻找某目标，而不是当前已经是某目标
    let leftBoundaryValue: string = "";
    const clear = () => {
        leftBoundaryValue = content = findTarget = undefined;
    };
    const plusContent = (char: string) => {
        if (!content) {
            content = char;
            if (findTarget === LxParseAttrTarget.name) {
                pushStep(
                    steps,
                    LxEventType.nodeNameStart,
                    cursor,
                    LxNodeType.attr
                );
            } else if (findTarget === LxParseAttrTarget.content) {
                pushStep(steps, LxEventType.nodeContentStart, cursor);
            }
            return;
        }
        content += char;
    };
    const fireAttrEnd = (currentTargetEnd: boolean = false) => {
        if (currentTargetEnd && findTarget) {
            if (findTarget === LxParseAttrTarget.name) {
                pushStep(steps, LxEventType.nodeNameEnd, cursor, content);
            } else if (findTarget === LxParseAttrTarget.content) {
                pushStep(steps, LxEventType.nodeContentEnd, cursor, content);
            }
        }
        pushStep(steps, LxEventType.nodeEnd, cursor, [
            AttrParser,
            findTarget === LxParseAttrTarget.name ||
            findTarget === LxParseAttrTarget.content
                ? LxNodeCloseType.fullClosed
                : LxNodeCloseType.notClosed,
        ]);
        clear();
    };
    let attrsEnd;
    const checkAttrEnd = (): boolean => {
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
        if (findTarget === LxParseAttrTarget.name) {
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
                    throw createLxError(ATTR_EQUAL_NEAR_SPACE, nextCursor);
                }
                pushStep(steps, LxEventType.nodeNameEnd, cursor, content);
                content = undefined;
                findTarget = LxParseAttrTarget.equal;
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
            if (
                parentNodeParser.checkAttrsEnd(
                    xml,
                    nextValidCharCursor,
                    options
                )
            ) {
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
        if (findTarget === LxParseAttrTarget.leftBoundary) {
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
                if (encounterAttrMoreEqual === AttrMoreEqualDisposal.newAttr) {
                    fireAttrEnd();
                    return true;
                }
                return false;
            }
        }
        if (findTarget === LxParseAttrTarget.content) {
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
                        : true)
                ) {
                    pushStep(
                        steps,
                        LxEventType.nodeContentEnd,
                        cursor,
                        content
                    );
                }
            } else {
                attrsEnd = !!parentNodeParser.checkAttrsEnd(
                    xml,
                    nextValidCharCursor,
                    options
                );
                if (REX_SPACE.test(xml[nextCursor.offset]) || attrsEnd) {
                    fireAttrEnd(true);
                    return true;
                }
            }
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
            throw createLxError(ATTR_EQUAL_NEAR_SPACE, nextCursor);
        }
    };
    for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
        const char = xml[cursor.offset];
        if (REX_SPACE.test(char)) {
            if (leftBoundaryValue && findTarget === LxParseAttrTarget.content) {
                plusContent(char);
                const brType = currentIsLineBreak(xml, cursor.offset);
                if (brType !== -1) {
                    if (findTarget === LxParseAttrTarget.content) {
                        if (!isTrueOption("allowAttrContentHasBr", options)) {
                            throw createLxError(ATTR_CONTENT_HAS_BR, cursor);
                        }
                        plusContent(
                            !brType ? char : char + xml[cursor.offset + 1]
                        );
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
                    throw createLxError(ATTR_NAME_IS_EMPTY, cursor);
                }
                pushStep(steps, LxEventType.nodeStart, cursor, AttrParser);
                pushStep(steps, LxEventType.attrEqual, cursor);
                findTarget = LxParseAttrTarget.leftBoundary;
                checkEqualNextSpace();
                if (checkAttrEnd()) {
                    return returnEnd();
                }
                continue;
            }
            if (findTarget === LxParseAttrTarget.equal) {
                pushStep(steps, LxEventType.attrEqual, cursor);
                findTarget = LxParseAttrTarget.leftBoundary;
                checkEqualNextSpace();
                if (checkAttrEnd()) {
                    return returnEnd();
                }
                continue;
            }
            if (findTarget === LxParseAttrTarget.leftBoundary) {
                const encounterAttrMoreEqual = computeOption(
                    options,
                    "encounterAttrMoreEqual",
                    DEFAULT_PARSE_OPTIONS.encounterAttrMoreEqual,
                    xml,
                    cursor,
                    AttrParser
                );
                if (
                    encounterAttrMoreEqual === AttrMoreEqualDisposal.throwError
                ) {
                    throw createLxError(ATTR_HAS_MORE_EQUAL, cursor);
                }
                pushStep(steps, LxEventType.attrEqual, cursor);
                checkEqualNextSpace();
                if (checkAttrEnd()) {
                    return returnEnd();
                }
                continue;
            }
            if (findTarget === LxParseAttrTarget.content && leftBoundaryValue) {
                plusContent(char);
                if (checkAttrEnd()) {
                    return returnEnd();
                }
                continue;
            }
            continue;
        }
        const boundaryCharMatch =
            findTarget === LxParseAttrTarget.content
                ? parentNodeParser.attrRightBoundaryChar
                : parentNodeParser.attrLeftBoundaryChar;
        const boundaryValue = getAttrBoundaryChar(
            xml,
            boundaryCharMatch,
            cursor
        );
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
                    throw createLxError(ATTR_NAME_IS_EMPTY, cursor);
                }
                pushStep(steps, LxEventType.nodeStart, cursor, AttrParser);
                leftBoundaryValue = boundaryValue;
                pushStep(
                    steps,
                    LxEventType.attrLeftBoundary,
                    cursor,
                    boundaryValue
                );
                moveCursor(
                    cursor,
                    0,
                    boundaryValue.length - 1,
                    boundaryValue.length - 1
                );
                content = "";
                findTarget = LxParseAttrTarget.content;
                if (checkAttrEnd()) {
                    return returnEnd();
                }
                continue;
            }
            if (findTarget === LxParseAttrTarget.leftBoundary) {
                findTarget = LxParseAttrTarget.content;
                content = "";
                leftBoundaryValue = boundaryValue;
                pushStep(
                    steps,
                    LxEventType.attrLeftBoundary,
                    cursor,
                    boundaryValue
                );
                moveCursor(
                    cursor,
                    0,
                    boundaryValue.length - 1,
                    boundaryValue.length - 1
                );
                if (checkAttrEnd()) {
                    return returnEnd();
                }
                continue;
            }
            if (
                findTarget === LxParseAttrTarget.content &&
                (parentNodeParser.attrBoundaryCharNeedEqual
                    ? leftBoundaryValue === boundaryValue
                    : true)
            ) {
                pushStep(
                    steps,
                    LxEventType.attrRightBoundary,
                    cursor,
                    boundaryValue
                );
                moveCursor(
                    cursor,
                    0,
                    boundaryValue.length - 1,
                    boundaryValue.length - 1
                );
                pushStep(steps, LxEventType.nodeEnd, cursor, [
                    AttrParser,
                    LxNodeCloseType.fullClosed,
                ]);
                clear();
                checkAttrEnd();
                return returnEnd();
            }
            moveCursor(
                cursor,
                0,
                boundaryValue.length - 1,
                boundaryValue.length - 1
            );
            plusContent(boundaryValue);
            continue;
        }
        if (
            findTarget === LxParseAttrTarget.name ||
            findTarget === LxParseAttrTarget.content
        ) {
            plusContent(char);
            if (checkAttrEnd()) {
                return returnEnd();
            }
            continue;
        }
        if (findTarget === LxParseAttrTarget.leftBoundary) {
            findTarget = LxParseAttrTarget.content;
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
            findTarget = LxParseAttrTarget.name;
            pushStep(steps, LxEventType.nodeStart, cursor, AttrParser);
            plusContent(char);
            if (checkAttrEnd()) {
                return returnEnd();
            }
        }
    }
    if (!attrsEnd && findTarget) {
        if (findTarget === LxParseAttrTarget.name) {
            pushStep(steps, LxEventType.nodeNameEnd, cursor, content);
            pushStep(steps, LxEventType.nodeEnd, cursor, [
                AttrParser,
                LxNodeCloseType.fullClosed,
            ]);
        } else if (findTarget === LxParseAttrTarget.equal) {
            pushStep(
                steps,
                LxEventType.nodeEnd,
                steps[steps.length - 1].cursor,
                [AttrParser, LxNodeCloseType.fullClosed]
            );
        } else if (findTarget === LxParseAttrTarget.leftBoundary) {
            pushStep(steps, LxEventType.nodeEnd, cursor, [
                AttrParser,
                LxNodeCloseType.notClosed,
            ]);
        } else if (findTarget === LxParseAttrTarget.content) {
            pushStep(steps, LxEventType.nodeContentEnd, cursor, content);
            pushStep(
                steps,
                LxEventType.nodeEnd,
                steps[steps.length - 1].cursor,
                [
                    AttrParser,
                    leftBoundaryValue
                        ? LxNodeCloseType.notClosed
                        : LxNodeCloseType.fullClosed,
                ]
            );
        }
        attrsEnd = true;
    }
    if (attrsEnd) {
        return "break";
    }
};

export const AttrParser: LxNodeParser = {
    nodeNature: LxNodeNature.alone,
    nodeType: LxNodeType.attr,
    parseMatch: "",
    parse: (context: LxParseContext, parentNodeParser?: LxNodeParser) => {
        const steps = tryParseAttrs(
            context.xml,
            context,
            parentNodeParser,
            context.options
        );
        boundStepsToContext(steps, context);
    },
    serializeMatch(currentNode: LxNodeJSON): boolean {
        return currentNode.type === LxNodeType.attr;
    },
    serialize(attr: LxNodeJSON): string {
        let [leftBoundary, rightBoundary] = Array.isArray(attr.boundaryChar)
            ? attr.boundaryChar
            : [attr.boundaryChar || "", attr.boundaryChar || ""];
        rightBoundary = rightBoundary || leftBoundary;
        return `${attr.name || ""}${repeatString(
            "=",
            attr.equalCount
        )}${leftBoundary}${attr.content || ""}${
            !attr.closeType || attr.closeType === LxNodeCloseType.fullClosed
                ? rightBoundary
                : ""
        }`;
    },
};
