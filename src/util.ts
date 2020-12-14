import {
    LxNode,
    LxParseResult,
    LxParseResultJSON,
    LxToJSONOptions,
    LxNodeJSON,
    LxMessage,
    LxWrong,
    LxCursorPosition,
    LxNodeParser,
    LxNodeParserMatcher,
    LxParseOptions,
    LxSerializeOptions,
    LxTryStep,
    LxEventType,
    LxTryStepData,
    LxNodeCloseType,
    LxParseContext,
    LxStartTagCompare,
} from "./types";
import { REX_SPACE } from "./var";

export const createLxError = (
    msg: LxMessage,
    cursor: LxCursorPosition
): LxWrong => {
    const err = (new Error(msg.message) as unknown) as LxWrong;
    err.code = msg.code;
    Object.assign(err, cursor);
    return err;
};

export const startsWith = (
    fullStr: string,
    targetStr: string | RegExp,
    position: number = 0
) => {
    const str = !position ? fullStr : fullStr.substr(position);
    if (targetStr instanceof RegExp) {
        const arr = str.match(targetStr);
        return arr && arr[0] && str.indexOf(arr[0]) === 0;
    }
    return str.indexOf(targetStr) === 0;
};

export const isFunc = (obj) =>
    typeof obj === "function" || obj instanceof Function;

export const pushStep = (
    steps: LxTryStep[],
    step: LxEventType,
    cursor: LxCursorPosition,
    data?: LxTryStepData | LxMessage
): LxTryStep[] => {
    steps.push(createStep(step, cursor, data));
    return steps;
};
export const createStep = (
    step: LxEventType,
    cursor: LxCursorPosition,
    data?: LxTryStepData | LxMessage
): LxTryStep => {
    let wrong: LxWrong;
    if (data) {
        let tsData = (data as unknown) as LxWrong;
        if (tsData.code && tsData.message && !tsData.stack) {
            wrong = createLxError(tsData, cursor);
        }
    }
    const result: LxTryStep = {
        step,
        cursor: {
            ...cursor,
        },
    };
    if (typeof data !== "undefined") {
        result.data = wrong || (data as LxTryStepData);
    }
    return result;
};

export const moveCursor = (
    cursor: LxCursorPosition,
    lineNumber?: number,
    column?: number,
    offset?: number
) => {
    if (lineNumber) {
        cursor.lineNumber += lineNumber;
    }
    if (column) {
        cursor.column += column;
        if (cursor.column < 0) {
            cursor.column = Math.abs(cursor.column);
        }
    }
    if (offset) {
        cursor.offset += offset;
    }
    return cursor;
};
export const pick = (
    prop: string,
    res: LxParseResultJSON,
    parseResult: LxParseResult,
    options?: LxToJSONOptions
) => {
    if (options && options[prop]) {
        res[prop] = parseResult[prop];
    }
};
export const nodeToJSON = (
    node: LxNode,
    options?: LxToJSONOptions
): LxNodeJSON => {
    const res = {} as LxNodeJSON;
    for (let prop in node) {
        if (prop !== "parent" && prop !== "parser") {
            if (prop === "steps") {
                if (options && options.steps) {
                    res[prop] = node[prop];
                }
            } else if (prop === "closeType") {
                if (
                    !(!node[prop] || node[prop] === LxNodeCloseType.fullClosed)
                ) {
                    res[prop] = node[prop];
                }
            } else if (prop !== "locationInfo") {
                if (prop === "attrs" || prop === "children") {
                    res[prop] = node[prop].map((item) =>
                        nodeToJSON(item, options)
                    );
                } else {
                    res[prop] = node[prop];
                }
            } else if (options && options.locationInfo) {
                res[prop] = JSON.parse(JSON.stringify(node[prop]));
            }
        }
    }
    return res;
};

export const lxWrongToJSON = (wrong: LxWrong): LxWrong => {
    const json = JSON.parse(JSON.stringify(wrong));
    json.message = wrong.message;
    json.stack = wrong.stack;
    return json;
};

export const currentIsLineBreak = (
    str: string,
    currentCharIndex: number
): number => {
    if (str[currentCharIndex] === "\n") {
        return 0;
    }
    if (str[currentCharIndex] === "\r" && str[currentCharIndex + 1] === "\n") {
        return 1;
    }
    return -1;
};

export const equalSubStr = (
    fullStr: string,
    index: number,
    str: string
): boolean => {
    if (fullStr.substr(index, str.length) === str) {
        return true;
    }
    return false;
};

export const repeatString = (str: string, repeatCount: number): string => {
    let res = "";
    if (!str || !repeatCount) {
        return res;
    }
    while (repeatCount--) {
        res += str;
    }
    return res;
};

export const equalCursor = (
    cursor1: LxCursorPosition,
    cursor2: LxCursorPosition
): boolean => {
    return (
        cursor1.lineNumber === cursor2.lineNumber &&
        cursor1.column === cursor2.column &&
        cursor1.offset === cursor2.offset
    );
};

export const notSpaceCharCursor = (xml: string, cursor: LxCursorPosition) => {
    const xmlLength = xml.length;
    const resultCursor = {
        ...cursor,
    };
    for (; resultCursor.offset < xmlLength; moveCursor(resultCursor, 0, 1, 1)) {
        const char = xml[resultCursor.offset];
        if (REX_SPACE.test(char)) {
            const brType = currentIsLineBreak(xml, resultCursor.offset);
            if (brType !== -1) {
                moveCursor(
                    resultCursor,
                    1,
                    -resultCursor.column,
                    !brType ? 0 : 1
                );
            }
            continue;
        }
        return resultCursor;
    }
};

export const ignoreSpaceFindCharCursor = (
    xml: string,
    cursor: LxCursorPosition,
    targetChar: string
) => {
    const xmlLength = xml.length;
    const resultCursor = {
        ...cursor,
    };
    for (; resultCursor.offset < xmlLength; moveCursor(resultCursor, 0, 1, 1)) {
        const char = xml[resultCursor.offset];
        if (REX_SPACE.test(char)) {
            const brType = currentIsLineBreak(xml, resultCursor.offset);
            if (brType !== -1) {
                moveCursor(
                    resultCursor,
                    1,
                    -resultCursor.column,
                    !brType ? 0 : 1
                );
            }
            continue;
        }
        if (char === targetChar) {
            return resultCursor;
        }
        return;
    }
};

export const toCursor = (like: LxCursorPosition): LxCursorPosition => {
    return {
        lineNumber: like.lineNumber,
        column: like.column,
        offset: like.offset,
    } as LxCursorPosition;
};

export const getEndCursor = (
    xml: string,
    cursor: LxCursorPosition
): LxCursorPosition => {
    const xmlLength = xml.length;
    const resultCursor = toCursor(cursor);
    for (; resultCursor.offset < xmlLength; moveCursor(resultCursor, 0, 1, 1)) {
        const brType = currentIsLineBreak(xml, resultCursor.offset);
        if (brType !== -1) {
            moveCursor(resultCursor, 1, -resultCursor.column, !brType ? 0 : 1);
        }
    }
    return resultCursor;
};

export const findStrCursor = (
    xml: string,
    cursor: LxCursorPosition,
    targetStr: string
): [boolean, LxCursorPosition, LxCursorPosition?] => {
    const xmlLength = xml.length;
    const resultCursor = toCursor(cursor);
    for (; resultCursor.offset < xmlLength; moveCursor(resultCursor, 0, 1, 1)) {
        const char = xml[resultCursor.offset];
        if (char === targetStr[0]) {
            const substr = xml.substr(resultCursor.offset, targetStr.length);
            if (substr === targetStr) {
                const start = toCursor(resultCursor);
                for (
                    let index = 0, len = substr.length;
                    index < len;
                    index++ && moveCursor(resultCursor, 0, 1, 1)
                ) {
                    const brType = currentIsLineBreak(xml, resultCursor.offset);
                    if (brType !== -1) {
                        moveCursor(
                            resultCursor,
                            1,
                            -resultCursor.column,
                            !brType ? 0 : 1
                        );
                    }
                }
                return [true, start, resultCursor];
            }
        }
        const brType = currentIsLineBreak(xml, resultCursor.offset);
        if (brType !== -1) {
            moveCursor(resultCursor, 1, -resultCursor.column, !brType ? 0 : 1);
        }
    }
    return [false, resultCursor];
};

export const ignoreSpaceIsHeadTail = (
    xml: string,
    cursor: LxCursorPosition,
    headChar: string,
    tailChar: string
): LxCursorPosition => {
    if (xml[cursor.offset] === headChar) {
        let resultCursor: LxCursorPosition = {
            ...cursor,
        };
        moveCursor(resultCursor, 0, 1, 1);
        resultCursor = ignoreSpaceFindCharCursor(xml, resultCursor, tailChar);
        if (resultCursor) {
            return resultCursor;
        }
    }
};
export const findNodeParser = (
    xml: string,
    cursor: LxCursorPosition,
    options: LxParseOptions
): LxNodeParser => {
    return options.nodeParser.find((parser) => {
        const matchType = typeof parser.parseMatch;
        if (matchType === "string") {
            if (
                xml.substr(
                    cursor.offset,
                    (parser.parseMatch as string).length
                ) === parser.parseMatch
            ) {
                return true;
            }
            return false;
        }
        if (matchType === "function") {
            return (parser.parseMatch as LxNodeParserMatcher)(
                xml,
                cursor,
                options
            );
        }
        if (parser.parseMatch instanceof RegExp) {
            return parser.parseMatch.test(xml.substr(cursor.offset));
        }
    });
};

export const findNodeSerializer = (
    currentNode: LxNodeJSON,
    brotherNodes: LxNodeJSON[],
    rootNodes: LxNodeJSON[],
    options: LxSerializeOptions,
    parentNode?: LxNodeJSON
): LxNodeParser => {
    return options.nodeParser.find((parser) => {
        return parser.serializeMatch(
            currentNode,
            brotherNodes,
            rootNodes,
            options,
            parentNode
        );
    });
};

// 在context.nodes中查找与endTag匹配的startTag的层级，找不到就返回-1，0代表currentNode，1代表currentNode.parent，2代表currentNode.parent.parent，以此类推...
export const findStartTagLevel = (
    endTagSteps: LxTryStep[],
    context: LxParseContext,
    compare: LxStartTagCompare
): number => {
    let level = 0;
    let node: LxNode = context.currentNode;
    if (compare(node, context, endTagSteps)) {
        return level;
    }
    if (node.parent) {
        while ((node = node.parent)) {
            level++;
            if (compare(node, context, endTagSteps)) {
                return level;
            }
        }
    }
    return -1;
};
