import {
    LxNode,
    LxParseResult,
    LxParseResultJSON,
    LxToJSONOptions,
    LxNodeJSON,
    LxMessage,
    LxWrong,
    LxCursorPosition,
    LxParseContext,
    LxNodeParser,
    LxNodeParserMatcher,
    LxParseOptions,
    LxSerializeOptions,
} from "./types";

export const createLxError = (msg: LxMessage, cursor: LxCursorPosition) => {
    const err = (new Error(msg.message) as unknown) as LxWrong;
    err.code = msg.code;
    Object.assign(err, cursor);
    return err;
};

export const isFunc = (obj) =>
    typeof obj === "function" || obj instanceof Function;

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
        if (prop !== "parent") {
            if (prop === "steps") {
                if (options && options.steps) {
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

// export const execEndTag = (context: LxParseContext, node: LxNode) => {
//     node.locationInfo.endTag = {
//         startCol: context.col,
//         startOffset: context.index,
//         startLine: context.line,
//     };
//     fireEvent(LxEventType.endTagStart, context, node);
//     if (node.type === LxNodeType.cdata) {
//         plusArgNumber(context, CDATA_END.length - 1, 0, CDATA_END.length - 1);
//     } else if (node.type === LxNodeType.processingInstruction) {
//         plusArgNumber(context, PI_END.length - 1, 0, PI_END.length - 1);
//     } else if (node.type === LxNodeType.comment) {
//         plusArgNumber(
//             context,
//             COMMENT_END.length - 1,
//             0,
//             COMMENT_END.length - 1
//         );
//     }
//     node.locationInfo.endTag.endCol = node.locationInfo.endCol = context.col;
//     node.locationInfo.endTag.endLine = node.locationInfo.endLine = context.line;
//     node.locationInfo.endTag.endOffset = node.locationInfo.endOffset =
//         context.index;
//     fireEvent(LxEventType.endTagEnd, context, node);
//     fireEvent(LxEventType.nodeEnd, context, node);
// };

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
    options: LxSerializeOptions
): LxNodeParser => {
    return options.nodeParser.find((parser) => {
        return parser.serializeMatch(
            currentNode,
            brotherNodes,
            rootNodes,
            options
        );
    });
};
