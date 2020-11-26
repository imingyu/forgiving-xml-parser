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

// export const plusArgNumber = (
//     context: LxParseContext,
//     index?: number,
//     linePlus?: number,
//     colPlus?: number
// ) => {
//     if (index) {
//         context.index += index;
//     }
//     if (linePlus) {
//         context.line += linePlus;
//     }
//     if (colPlus) {
//         context.col += colPlus;
//         context.col = Math.abs(context.col);
//     }
//     if (linePlus || colPlus) {
//         setArgMaxNumber(context);
//     }
// };

// export const setArgMaxNumber = (context: LxParseContext) => {
//     if (context.line > context.maxLine) {
//         context.maxLine = context.line;
//     }
//     if (context.maxCol < context.col) {
//         context.maxCol = context.col;
//     }
// };

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

// export const getNodeType = (context: LxParseContext): LxNodeType => {
//     if (equalSubStr(context.xml, context.index, CDATA_START)) {
//         return LxNodeType.cdata;
//     }
//     if (equalSubStr(context.xml, context.index, COMMENT_START)) {
//         return LxNodeType.comment;
//     }
//     if (equalSubStr(context.xml, context.index, PI_START)) {
//         return LxNodeType.processingInstruction;
//     }
//     if (equalSubStr(context.xml, context.index, DTD_START)) {
//         return LxNodeType.dtd;
//     }
//     return LxNodeType.element;
// };

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

export const getEndCharCursor = (
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

export const checkTagStart = (
    xml: string,
    cursor: LxCursorPosition,
    char1: string,
    char2: string
): LxCursorPosition => {
    if (xml[cursor.offset] === char1) {
        let resultCursor: LxCursorPosition = {
            ...cursor,
        };
        moveCursor(resultCursor, 0, 1, 1);
        resultCursor = getEndCharCursor(xml, resultCursor, char2);
        if (resultCursor) {
            return resultCursor;
        }
    }
};

export const checkElementEndTagStart = (
    xml: string,
    cursor: LxCursorPosition
): LxCursorPosition => {
    return checkTagStart(xml, cursor, "<", "/");
};

export const checkPIStartTagStart = (
    xml: string,
    cursor: LxCursorPosition
): LxCursorPosition => {
    return checkTagStart(xml, cursor, "<", "?");
};
export const checkPIEndTagStart = (
    xml: string,
    cursor: LxCursorPosition
): LxCursorPosition => {
    return checkTagStart(xml, cursor, "?", ">");
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
