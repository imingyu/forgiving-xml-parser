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
    LxNode,
    LxNodeNature,
    LxNodeType,
    LxParseAttrTarget,
    LxParseOptions,
    LxTryStep,
} from "../types";
import { createLxError, currentIsLineBreak, moveCursor } from "../util";
import { DEFAULT_OPTIONS, REX_SPACE } from "../var";
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
    let content;
    let findTarget: LxParseAttrTarget; // 表示正在寻找某目标，而不是当前已经是某目标
    let leftBoundaryValue = "";
    const clear = () => {
        leftBoundaryValue = content = findTarget = undefined;
    };
    const plusContent = (char: string) => {
        if (!content) {
            content = char;
            if (findTarget === LxParseAttrTarget.name) {
                steps.push({
                    step: LxEventType.nodeNameStart,
                    cursor: {
                        ...cursor,
                    },
                    data: LxNodeType.attr,
                });
            } else if (findTarget === LxParseAttrTarget.content) {
                steps.push({
                    step: LxEventType.nodeContentStart,
                    cursor: {
                        ...cursor,
                    },
                });
            }
            return;
        }
        content += char;
    };
    const initAttr = (char: string) => {
        findTarget = LxParseAttrTarget.name;
        steps.push({
            step: LxEventType.nodeStart,
            cursor: {
                ...cursor,
            },
            data: [LxNodeType.attr, LxNodeNature.alone],
        });
        plusContent(char);
    };
    const checkCurrentAttrNameEnd = () => {
        const endType = checkAttrNameEnd(xml, cursor);
        if (endType) {
            steps.push({
                step: LxEventType.nodeNameEnd,
                cursor: {
                    ...cursor,
                },
                data: content,
            });
            content = undefined;
            findTarget = LxParseAttrTarget.equal;
            if (endType > 1) {
                steps.push({
                    step: LxEventType.nodeEnd,
                    cursor: {
                        ...cursor,
                    },
                    data: LxNodeType.attr,
                });
                clear();
                if (endType > 2) {
                    steps.push({
                        step: LxEventType.attrsEnd,
                        cursor: {
                            ...cursor,
                        },
                    });
                }
            }
        }
    };
    const checkCurrentAttrContentEnd = () => {
        const endType = checkAttrContentEnd(xml, cursor, leftBoundaryValue);
        if (endType) {
            steps.push({
                step: LxEventType.nodeContentEnd,
                cursor: {
                    ...cursor,
                },
            });
            content = undefined;
            if (!leftBoundaryValue) {
                steps.push({
                    step: LxEventType.nodeEnd,
                    cursor: {
                        ...cursor,
                    },
                    data: LxNodeType.attr,
                });
                clear();
                if (endType > 1) {
                    steps.push({
                        step: LxEventType.attrsEnd,
                        cursor: {
                            ...cursor,
                        },
                    });
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
                steps.push({
                    step: LxEventType.nodeEnd,
                    cursor: {
                        ...cursor,
                    },
                    data: LxNodeType.attr,
                });
            }
            clear();
            if (endType > 2) {
                steps.push({
                    step: LxEventType.attrsEnd,
                    cursor: {
                        ...cursor,
                    },
                });
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
                        DEFAULT_OPTIONS.allowAttrNameEmpty,
                        cursor
                    )
                ) {
                    steps.push({
                        step: LxEventType.error,
                        cursor: {
                            ...cursor,
                        },
                        data: createLxError(ATTR_NAME_IS_EMPTY, cursor),
                    });
                }
                steps.push({
                    step: LxEventType.nodeStart,
                    cursor: {
                        ...cursor,
                    },
                    data: [LxNodeType.attr, LxNodeNature.alone],
                });
                steps.push({
                    step: LxEventType.attrEqual,
                    cursor: {
                        ...cursor,
                    },
                });
                content = undefined;
                findTarget = LxParseAttrTarget.leftBoundary;
                checkNodeAttrsEnd();
                continue;
            }
            if (findTarget === LxParseAttrTarget.equal) {
                steps.push({
                    step: LxEventType.attrEqual,
                    cursor: {
                        ...cursor,
                    },
                });
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
                        DEFAULT_OPTIONS.encounterAttrMoreEqual
                    )
                ) {
                    steps.push({
                        step: LxEventType.error,
                        cursor: {
                            ...cursor,
                        },
                        data: createLxError(ATTR_HAS_MORE_EQUAL, cursor),
                    });
                    steps.push({
                        step: LxEventType.attrEqual,
                        cursor: {
                            ...cursor,
                        },
                    });
                } else if (
                    equalOption(
                        "encounterAttrMoreEqual",
                        AttrMoreEqualDisposal.newAttr,
                        options,
                        DEFAULT_OPTIONS.encounterAttrMoreEqual
                    )
                ) {
                    steps.push({
                        step: LxEventType.nodeEnd,
                        cursor: {
                            ...cursor,
                        },
                        data: LxNodeType.attr,
                    });
                    clear();
                    continue;
                }
                steps.push({
                    step: LxEventType.attrEqual,
                    cursor: {
                        ...cursor,
                    },
                });
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
                        DEFAULT_OPTIONS.allowAttrNameEmpty,
                        cursor
                    )
                ) {
                    steps.push({
                        step: LxEventType.error,
                        cursor: {
                            ...cursor,
                        },
                        data: createLxError(ATTR_NAME_IS_EMPTY, cursor),
                    });
                }
                steps.push({
                    step: LxEventType.nodeStart,
                    cursor: {
                        ...cursor,
                    },
                    data: [LxNodeType.attr, LxNodeNature.alone],
                });
                steps.push({
                    step: LxEventType.attrLeftBoundary,
                    cursor: {
                        ...cursor,
                    },
                    data: char,
                });
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
                steps.push({
                    step: LxEventType.attrLeftBoundary,
                    cursor: {
                        ...cursor,
                    },
                    data: char,
                });
                checkCurrentAttrContentEnd();
                continue;
            }
            if (
                findTarget === LxParseAttrTarget.content &&
                leftBoundaryValue === char
            ) {
                steps.push({
                    step: LxEventType.attrRightBoundary,
                    cursor: {
                        ...cursor,
                    },
                    data: char,
                });
                steps.push({
                    step: LxEventType.nodeEnd,
                    cursor: {
                        ...cursor,
                    },
                    data: LxNodeType.attr,
                });
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
                steps.push({
                    step: LxEventType.startTagEnd,
                    cursor: {
                        ...cursor,
                    },
                });
                if (selfClose) {
                    steps.push({
                        step: LxEventType.nodeEnd,
                        cursor: {
                            ...cursor,
                        },
                        data: [parentNodeType, true],
                    });
                }
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
                DEFAULT_OPTIONS.allowNearAttrEqualSpace,
                cursor
            )
        ) {
            steps.push({
                step: LxEventType.error,
                cursor: {
                    ...cursor,
                },
                data: createLxError(ATTR_EQUAL_NEAR_SPACE, cursor),
            });
        }
        const brType = currentIsLineBreak(xml, cursor.offset);
        if (brType !== -1) {
            if (checkNodeAttrsEnd()) {
                break;
            }
            if (findTarget === LxParseAttrTarget.content) {
                if (!isTrueOption("allowAttrContentHasBr", options)) {
                    steps.push({
                        step: LxEventType.error,
                        cursor: {
                            ...cursor,
                        },
                        data: createLxError(ATTR_CONTENT_HAS_BR, cursor),
                    });
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
    return steps;
};
