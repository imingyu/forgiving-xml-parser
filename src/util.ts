import {
    FxNode,
    FxParseResult,
    FxParseResultJSON,
    FxToJSONOptions,
    FxNodeJSON,
    FxMessage,
    FxWrong,
    FxCursorPosition,
    FxNodeAdapter,
    FxNodeParserMatcher,
    FxParseOptions,
    FxSerializeOptions,
    FxTryStep,
    FxEventType,
    FxTryStepData,
    FxNodeCloseType,
    FxParseContext,
    FxStartTagCompare,
    FxNodeLocationInfo,
    FxLocation,
    FxSerializeBaseOptions,
} from "./types";
import { REX_SPACE } from "./var";

export const createFxError = (msg: FxMessage, cursor: FxCursorPosition): FxWrong => {
    const err = (new Error(msg.message) as unknown) as FxWrong;
    err.code = msg.code;
    Object.assign(err, cursor);
    return err;
};

export const isElementEndTagBegin = (xml: string, cursor: FxCursorPosition): FxCursorPosition => {
    return ignoreSpaceIsHeadTail(xml, toCursor(cursor), "<", "/");
};

export const startsWith = (fullStr: string, targetStr: string | RegExp, position: number = 0) => {
    const str = !position ? fullStr : fullStr.substr(position);
    if (targetStr instanceof RegExp) {
        const arr = str.match(targetStr);
        return arr && arr[0] && str.indexOf(arr[0]) === 0;
    }
    return str.indexOf(targetStr) === 0;
};

export const isFunc = (obj) => typeof obj === "function" || obj instanceof Function;

export const pushStep = (
    steps: FxTryStep[],
    step: FxEventType,
    cursor: FxCursorPosition,
    data?: FxTryStepData | FxMessage
): FxTryStep[] => {
    steps.push(createStep(step, cursor, data));
    return steps;
};
export const createStep = (
    step: FxEventType,
    cursor: FxCursorPosition,
    data?: FxTryStepData | FxMessage
): FxTryStep => {
    let wrong: FxWrong;
    if (data) {
        let tsData = (data as unknown) as FxWrong;
        if (tsData.code && tsData.message && !tsData.stack) {
            wrong = createFxError(tsData, cursor);
        }
    }
    const result: FxTryStep = {
        step,
        cursor: {
            ...cursor,
        },
    };
    if (typeof data !== "undefined") {
        result.data = wrong || (data as FxTryStepData);
    }
    return result;
};

export const moveCursor = (
    cursor: FxCursorPosition,
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
    res: FxParseResultJSON,
    parseResult: FxParseResult,
    options: FxToJSONOptions
) => {
    if (options[prop]) {
        res[prop] = parseResult[prop];
    }
};
export const nodeToJSON = (node: FxNode, options: FxToJSONOptions): FxNodeJSON => {
    const res = {} as FxNodeJSON;
    const hasFilter = isFunc(options.dataFilter);
    for (let prop in node) {
        if (prop !== "parent" && prop !== "parser") {
            if (prop === "steps") {
                if (options.steps) {
                    res[prop] = node[prop].map((step) => {
                        const res = {
                            ...step,
                        };
                        delete res.target;
                        if (Array.isArray(res.data)) {
                            let [nodeType, closeType, customType] = res.data;
                            if (typeof nodeType === "object") {
                                const np = nodeType as FxNodeAdapter;
                                customType = customType || np.nodeCustomType;
                                nodeType = np.nodeType;
                            }
                            const data = [nodeType, closeType, customType];
                            if (!data[2]) {
                                data.splice(2, 1);
                            }
                            res.data = data as FxTryStepData;
                        } else if (typeof res.data === "object") {
                            const np = res.data as FxNodeAdapter;
                            res.data = [
                                np.nodeType,
                                step.step === FxEventType.nodeEnd
                                    ? FxNodeCloseType.fullClosed
                                    : undefined,
                                np.nodeCustomType,
                            ];
                            if (!res.data[2]) {
                                res.data.pop();
                            }
                            if (!res.data[1]) {
                                res.data.splice(1, 1);
                            }
                        }
                        return hasFilter ? (options.dataFilter(step, res) as FxTryStep) : res;
                    });
                }
            } else if (prop === "closeType") {
                if (!(!node[prop] || node[prop] === FxNodeCloseType.fullClosed)) {
                    res[prop] = node[prop];
                }
            } else if (prop !== "locationInfo") {
                if (prop === "attrs" || prop === "children") {
                    res[prop] = node[prop].map((item) => {
                        if (hasFilter) {
                            return options.dataFilter(
                                item,
                                nodeToJSON(item, options)
                            ) as FxNodeJSON;
                        }
                        return nodeToJSON(item, options);
                    });
                } else {
                    res[prop] = node[prop];
                }
            } else if (options.locationInfo) {
                res[prop] = hasFilter
                    ? (options.dataFilter(
                          node[prop],
                          JSON.parse(JSON.stringify(node[prop]))
                      ) as FxLocation)
                    : JSON.parse(JSON.stringify(node[prop]));
            }
        }
    }
    return res;
};

export const lxWrongToJSON = (wrong: FxWrong): FxWrong => {
    const json = JSON.parse(JSON.stringify(wrong));
    json.message = wrong.message;
    json.stack = wrong.stack;
    return json;
};

export const currentIsLineBreak = (str: string, currentCharIndex: number): number => {
    if (str[currentCharIndex] === "\n") {
        return 0;
    }
    if (str[currentCharIndex] === "\r" && str[currentCharIndex + 1] === "\n") {
        return 1;
    }
    return -1;
};

export const equalSubStr = (fullStr: string, index: number, str: string): boolean => {
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

export const equalCursor = (cursor1: FxCursorPosition, cursor2: FxCursorPosition): boolean => {
    return (
        cursor1.lineNumber === cursor2.lineNumber &&
        cursor1.column === cursor2.column &&
        cursor1.offset === cursor2.offset
    );
};

export const notSpaceCharCursor = (xml: string, cursor: FxCursorPosition) => {
    const xmlLength = xml.length;
    const resultCursor = {
        ...cursor,
    };
    for (; resultCursor.offset < xmlLength; moveCursor(resultCursor, 0, 1, 1)) {
        const char = xml[resultCursor.offset];
        if (REX_SPACE.test(char)) {
            const brType = currentIsLineBreak(xml, resultCursor.offset);
            if (brType !== -1) {
                moveCursor(resultCursor, 1, -resultCursor.column, !brType ? 0 : 1);
            }
            continue;
        }
        return resultCursor;
    }
};

export const ignoreSpaceFindCharCursor = (
    xml: string,
    cursor: FxCursorPosition,
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
                moveCursor(resultCursor, 1, -resultCursor.column, !brType ? 0 : 1);
            }
            continue;
        }
        if (char === targetChar) {
            return resultCursor;
        }
        return;
    }
};

export const toCursor = (like: FxCursorPosition): FxCursorPosition => {
    return {
        lineNumber: like.lineNumber,
        column: like.column,
        offset: like.offset,
    } as FxCursorPosition;
};

export const getEndCursor = (xml: string, cursor: FxCursorPosition): FxCursorPosition => {
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
    cursor: FxCursorPosition,
    targetStr: string
): [boolean, FxCursorPosition, FxCursorPosition?] => {
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
                        moveCursor(resultCursor, 1, -resultCursor.column, !brType ? 0 : 1);
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
    cursor: FxCursorPosition,
    headChar: string,
    tailChar: string
): FxCursorPosition => {
    if (xml[cursor.offset] === headChar) {
        let resultCursor: FxCursorPosition = {
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
    cursor: FxCursorPosition,
    options: FxParseOptions
): FxNodeAdapter => {
    return options.nodeAdapters.find((parser) => {
        const matchType = typeof parser.parseMatch;
        if (matchType === "string") {
            if (
                xml.substr(cursor.offset, (parser.parseMatch as string).length) ===
                parser.parseMatch
            ) {
                return true;
            }
            return false;
        }
        if (matchType === "function") {
            return (parser.parseMatch as FxNodeParserMatcher)(xml, cursor, options);
        }
        if (parser.parseMatch instanceof RegExp) {
            return parser.parseMatch.test(xml.substr(cursor.offset));
        }
    });
};

export const findNodeSerializer = (
    currentNode: FxNodeJSON,
    siblingNodes: FxNodeJSON[],
    rootNodes: FxNodeJSON[],
    options: FxSerializeOptions,
    parentNode?: FxNodeJSON
): FxNodeAdapter => {
    return options.nodeAdapters.find((parser) => {
        return parser.serializeMatch(currentNode, siblingNodes, rootNodes, options, parentNode);
    });
};

// 在context.nodes中查找与endTag匹配的startTag的层级，找不到就返回-1，0代表currentNode，1代表currentNode.parent，2代表currentNode.parent.parent，以此类推...
export const findStartTagLevel = (
    endTagSteps: FxTryStep[],
    context: FxParseContext,
    compare: FxStartTagCompare
): number => {
    let level = 0;
    let node: FxNode = context.currentNode;
    if (!node) {
        return -1;
    }
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

export const setContextMaxCursor = (context: FxParseContext, cursor: FxCursorPosition) => {
    if (context.maxLineNumber < cursor.lineNumber) {
        context.maxLineNumber = cursor.lineNumber;
    }
    if (context.maxColumn < cursor.column) {
        context.maxColumn = cursor.column;
    }
};

export const createNodeByNodeStartStep = (step: FxTryStep): FxNode => {
    const nodeAdapter = step.data as FxNodeAdapter;
    return {
        type: nodeAdapter.nodeType,
        parser: nodeAdapter,
        locationInfo: {
            startLineNumber: step.cursor.lineNumber,
            startColumn: step.cursor.column,
            startOffset: step.cursor.offset,
        },
        steps: [],
    };
};

export const setNodeLocationByCursor = (
    locationInfo: FxNodeLocationInfo,
    cursor: FxCursorPosition,
    prop?: "startTag" | "endTag"
) => {
    const loc = prop ? locationInfo[prop] : locationInfo;
    loc.endLineNumber = cursor.lineNumber;
    loc.endColumn = cursor.column;
    loc.endOffset = cursor.offset;
};

export const filterOptions = <T extends FxParseOptions | FxSerializeOptions | FxToJSONOptions>(
    defaultOptions?: T,
    options?: T
): T => {
    const res = defaultOptions ? Object.assign({}, defaultOptions) : ({} as T);
    if ("nodeAdapters" in res) {
        (res as FxParseOptions).nodeAdapters = (res as FxParseOptions).nodeAdapters.map(
            (item) => item
        );
    }
    if (typeof options === "object") {
        Object.assign(res, options);
    }
    return res;
};

export const filterFirstAttrSteps = (
    steps: FxTryStep[],
    filter: Function
): Array<[number, FxTryStep]> => {
    const res: Array<[number, FxTryStep]> = [];
    for (let i = 0, len = steps.length; i < len; i++) {
        const step = steps[i];
        let hasBreak;
        if (step.step === FxEventType.nodeEnd || step.step === FxEventType.startTagEnd) {
            hasBreak = true;
        }
        if (filter(step)) {
            res.push([i, step]);
        }
        if (hasBreak) {
            break;
        }
    }
    return res;
};
