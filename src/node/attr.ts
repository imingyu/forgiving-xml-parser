import {
    ATTR_CONTENT_HAS_BR,
    ATTR_EQUAL_NEAR_SPACE,
    ATTR_HAS_MORE_EQUAL,
    ATTR_NAME_IS_EMPTY,
} from "../message";
import { computeOption, equalOption, isTrueOption } from "../option";
import {
    AttrMoreEqualDisposal,
    LxCursorPosition,
    LxEventType,
    LxNodeCloseType,
    LxNodeNature,
    LxNodeType,
    LxParseAttrTarget,
    LxParseOptions,
    LxTryStep,
} from "../types";
import { currentIsLineBreak, moveCursor, pushStep } from "../util";
import { DEFAULT_PARSE_OPTIONS, REX_SPACE } from "../var";
export const checkAttrsEnd = (
    xml: string,
    cursor: LxCursorPosition
): number => {
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
export const checkAttrNameEnd = (
    xml: string,
    cursor: LxCursorPosition
): number => {
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
export const checkAttrContentEnd = (
    xml: string,
    cursor: LxCursorPosition,
    boundaryChar: string
): number => {
    const nextChar = xml[cursor.offset + 1];
    if (boundaryChar && nextChar === boundaryChar) {
        return 1;
    }
    if (!boundaryChar) {
        if (REX_SPACE.test(nextChar) || nextChar === "=") {
            return 1;
        }
        return checkAttrsEnd(xml, cursor);
    }
    return 0;
};
export const tryParseElementAttrs = (
    xml: string,
    cursor: LxCursorPosition,
    parentNodeType: LxNodeType,
    options?: LxParseOptions
) => {
    const steps: LxTryStep[] = [];
    const xmlLength = xml.length;
    let content: string;
    let findTarget: LxParseAttrTarget; // 表示正在寻找某目标，而不是当前已经是某目标
    let leftBoundaryValue: string = "";
    let hasBreak;
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
    const initAttr = (char: string) => {
        findTarget = LxParseAttrTarget.name;
        pushStep(steps, LxEventType.nodeStart, cursor, [
            LxNodeType.attr,
            LxNodeNature.alone,
        ]);
        plusContent(char);
    };
    const checkCurrentAttrNameEnd = () => {
        const endType = checkAttrNameEnd(xml, cursor);
        if (endType) {
            pushStep(steps, LxEventType.nodeNameEnd, cursor, content);
            content = undefined;
            findTarget = LxParseAttrTarget.equal;
            if (endType > 1) {
                pushStep(steps, LxEventType.nodeEnd, cursor, [
                    LxNodeType.attr,
                    LxNodeCloseType.fullClosed,
                ]);
                clear();
                if (endType > 2) {
                    pushStep(steps, LxEventType.attrsEnd, cursor);
                }
            }
        }
    };
    const checkCurrentAttrContentEnd = () => {
        const endType = checkAttrContentEnd(xml, cursor, leftBoundaryValue);
        if (endType) {
            pushStep(steps, LxEventType.nodeContentEnd, cursor, content);
            content = undefined;
            if (!leftBoundaryValue) {
                pushStep(steps, LxEventType.nodeEnd, cursor, [
                    LxNodeType.attr,
                    LxNodeCloseType.fullClosed,
                ]);
                clear();
                if (endType > 1) {
                    pushStep(steps, LxEventType.attrsEnd, cursor);
                }
            }
        }
    };
    const checkNodeAttrsEnd = () => {
        const endType = checkAttrsEnd(xml, cursor);
        if (
            endType &&
            (!findTarget ||
                findTarget === LxParseAttrTarget.equal ||
                findTarget === LxParseAttrTarget.leftBoundary)
        ) {
            if (findTarget) {
                pushStep(steps, LxEventType.nodeEnd, cursor, [
                    LxNodeType.attr,
                    LxNodeCloseType.fullClosed,
                ]);
            }
            clear();
            if (endType > 2) {
                pushStep(steps, LxEventType.attrsEnd, cursor);
            }
            return true;
        }
    };
    for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
        const char = xml[cursor.offset];
        const trimChar = char.trim();
        if (char === "=") {
            if (!findTarget) {
                if (
                    !computeOption(
                        options,
                        "allowAttrNameEmpty",
                        DEFAULT_PARSE_OPTIONS.allowAttrNameEmpty,
                        cursor
                    )
                ) {
                    return pushStep(
                        steps,
                        LxEventType.error,
                        cursor,
                        ATTR_NAME_IS_EMPTY
                    );
                }
                pushStep(steps, LxEventType.nodeStart, cursor, [
                    LxNodeType.attr,
                    LxNodeNature.alone,
                ]);
                pushStep(steps, LxEventType.attrEqual, cursor);
                content = undefined;
                findTarget = LxParseAttrTarget.leftBoundary;
                checkNodeAttrsEnd();
                continue;
            }
            if (findTarget === LxParseAttrTarget.equal) {
                pushStep(steps, LxEventType.attrEqual, cursor);
                findTarget = LxParseAttrTarget.leftBoundary;
                checkNodeAttrsEnd();
                continue;
            }
            if (findTarget === LxParseAttrTarget.leftBoundary) {
                if (
                    equalOption(
                        "encounterAttrMoreEqual",
                        AttrMoreEqualDisposal.throwError,
                        options,
                        DEFAULT_PARSE_OPTIONS.encounterAttrMoreEqual
                    )
                ) {
                    return pushStep(
                        steps,
                        LxEventType.error,
                        cursor,
                        ATTR_HAS_MORE_EQUAL
                    );
                } else if (
                    equalOption(
                        "encounterAttrMoreEqual",
                        AttrMoreEqualDisposal.newAttr,
                        options,
                        DEFAULT_PARSE_OPTIONS.encounterAttrMoreEqual
                    )
                ) {
                    pushStep(steps, LxEventType.nodeEnd, cursor, [
                        LxNodeType.attr,
                        LxNodeCloseType.fullClosed,
                    ]);
                    clear();
                    continue;
                }
                pushStep(steps, LxEventType.attrEqual, cursor);
                checkNodeAttrsEnd();
                continue;
            }
            if (findTarget === LxParseAttrTarget.content && leftBoundaryValue) {
                plusContent(char);
                checkCurrentAttrContentEnd();
                continue;
            }
            continue;
        }
        if (char === "'" || char === '"') {
            if (!findTarget) {
                if (
                    !computeOption(
                        options,
                        "allowAttrNameEmpty",
                        DEFAULT_PARSE_OPTIONS.allowAttrNameEmpty,
                        cursor
                    )
                ) {
                    return pushStep(
                        steps,
                        LxEventType.error,
                        cursor,
                        ATTR_NAME_IS_EMPTY
                    );
                }
                pushStep(steps, LxEventType.nodeStart, cursor, [
                    LxNodeType.attr,
                    LxNodeNature.alone,
                ]);
                pushStep(steps, LxEventType.attrLeftBoundary, cursor, char);
                content = "";
                findTarget = LxParseAttrTarget.content;
                leftBoundaryValue = char;
                checkCurrentAttrContentEnd();
                continue;
            }
            if (findTarget === LxParseAttrTarget.leftBoundary) {
                findTarget = LxParseAttrTarget.content;
                content = "";
                leftBoundaryValue = char;
                pushStep(steps, LxEventType.attrLeftBoundary, cursor, char);
                checkCurrentAttrContentEnd();
                continue;
            }
            if (
                findTarget === LxParseAttrTarget.content &&
                leftBoundaryValue === char
            ) {
                pushStep(steps, LxEventType.attrRightBoundary, cursor, char);
                pushStep(steps, LxEventType.nodeEnd, cursor, [
                    LxNodeType.attr,
                    LxNodeCloseType.fullClosed,
                ]);
                clear();
                continue;
            }
            continue;
        }
        let selfClose = char === "/" && xml[cursor.offset + 1] === ">";
        if (char === ">" || selfClose) {
            if (
                !findTarget ||
                findTarget === LxParseAttrTarget.equal ||
                findTarget === LxParseAttrTarget.leftBoundary ||
                (findTarget === LxParseAttrTarget.content && !leftBoundaryValue)
            ) {
                selfClose && moveCursor(cursor, 0, 1, 1);
                pushStep(steps, LxEventType.startTagEnd, cursor);
                if (selfClose) {
                    pushStep(steps, LxEventType.nodeEnd, cursor, [
                        parentNodeType,
                        LxNodeCloseType.selfCloseing,
                    ]);
                }
                hasBreak = true;
                break;
            }
            if (findTarget === LxParseAttrTarget.content && leftBoundaryValue) {
                plusContent(char);
                continue;
            }
            continue;
        }
        if (trimChar) {
            if (!content && !findTarget) {
                initAttr(char);
                checkCurrentAttrNameEnd();
            } else if (findTarget === LxParseAttrTarget.equal) {
                findTarget = LxParseAttrTarget.name;
                plusContent(char);
                checkCurrentAttrNameEnd();
            } else if (findTarget === LxParseAttrTarget.name) {
                plusContent(char);
                checkCurrentAttrNameEnd();
            } else if (findTarget === LxParseAttrTarget.leftBoundary) {
                leftBoundaryValue = undefined;
                findTarget = LxParseAttrTarget.content;
                plusContent(char);
                checkCurrentAttrContentEnd();
            } else if (findTarget === LxParseAttrTarget.content) {
                plusContent(char);
                checkCurrentAttrContentEnd();
            }
            continue;
        }
        if (
            (xml[cursor.offset - 1] === "=" ||
                xml[cursor.offset + 1] === "=") &&
            !computeOption(
                options,
                "allowNearAttrEqualSpace",
                DEFAULT_PARSE_OPTIONS.allowNearAttrEqualSpace,
                cursor
            )
        ) {
            return pushStep(
                steps,
                LxEventType.error,
                cursor,
                ATTR_EQUAL_NEAR_SPACE
            );
        }
        const brType = currentIsLineBreak(xml, cursor.offset);
        if (brType !== -1) {
            if (checkNodeAttrsEnd()) {
                hasBreak = true;
                break;
            }
            if (findTarget === LxParseAttrTarget.content) {
                if (!isTrueOption("allowAttrContentHasBr", options)) {
                    return pushStep(
                        steps,
                        LxEventType.error,
                        cursor,
                        ATTR_CONTENT_HAS_BR
                    );
                }
                plusContent(!brType ? char : char + xml[cursor.offset + 1]);
            }
            moveCursor(cursor, 1, -cursor.column, !brType ? 0 : 1);
            continue;
        }
        if (findTarget === LxParseAttrTarget.content && leftBoundaryValue) {
            plusContent(char);
        }
    }
    if (!hasBreak && findTarget) {
        if (findTarget === LxParseAttrTarget.name) {
            pushStep(steps, LxEventType.nodeNameEnd, cursor, content);
            pushStep(steps, LxEventType.nodeEnd, cursor, [
                LxNodeType.attr,
                LxNodeCloseType.fullClosed,
            ]);
        } else if (findTarget === LxParseAttrTarget.equal) {
            pushStep(
                steps,
                LxEventType.nodeEnd,
                steps[steps.length - 1].cursor,
                [LxNodeType.attr, LxNodeCloseType.fullClosed]
            );
        } else if (findTarget === LxParseAttrTarget.leftBoundary) {
            pushStep(steps, LxEventType.nodeEnd, cursor, [
                LxNodeType.attr,
                LxNodeCloseType.notClosed,
            ]);
        } else if (findTarget === LxParseAttrTarget.content) {
            pushStep(
                steps,
                LxEventType.nodeEnd,
                steps[steps.length - 1].cursor,
                [
                    LxNodeType.attr,
                    leftBoundaryValue
                        ? LxNodeCloseType.notClosed
                        : LxNodeCloseType.fullClosed,
                ]
            );
        }
        pushStep(steps, LxEventType.attrsEnd, cursor);
    }
    return steps;
};
