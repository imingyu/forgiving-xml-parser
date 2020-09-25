import {
    LxNode,
    LxParseArg,
    LxNodeType,
    LxError,
    LxParseError,
    LxLocation,
    LxParseOptions,
    LxParseResult,
    LxParseResultJSON,
    LxToJSONOptions,
    LxNodeJSON,
} from "./types";
import {
    TAG_NOT_CLOSE,
    TAG_BOUNDARY_CHAR_HAS_SPACE,
    TAG_HAS_MORE_BOUNDARY_CHAR,
    TAG_NAME_IS_EMPTY,
    ATTR_CONTENT_HAS_BR,
    ATTR_NAME_IS_EMPTY,
    ATTR_HAS_MORE_EQUAL,
    ATTR_NAME_IS_WRONG,
    ATTR_IS_WRONG,
    TAG_NAME_NOT_EQUAL,
} from "./message";

const RexSpace = /\s/g;
class LxErrorImpl extends Error implements LxError {
    lxCol: number;
    lxLine: number;
    constructor(line: number, col: number, ...args) {
        super(...args);
        this.lxLine = line;
        this.lxCol = col;
    }
    toJSON(): LxParseError {
        return {
            message: this.message,
            line: this.lxLine,
            col: this.lxCol,
        };
    }
}
const throwError = (message: string, line: number, col: number) => {
    throw new LxErrorImpl(line, col, message);
};

export const firstAfterCharsIndex = (
    afterIndex: number,
    chars: string,
    str: string
): number => {
    const index = str.substr(afterIndex + 1).indexOf(chars);
    if (index === -1) {
        return index;
    }
    return afterIndex + index;
};

export const firstNoMatchIndex = (
    afterIndex: number,
    char: string | RegExp,
    str: string
): number => {
    str = str.substr(afterIndex + 1);
    if (!str) {
        return -1;
    }
    for (let index = 0, len = str.length; index < len; index++) {
        if (
            (typeof char === "string" && str[index] !== char) ||
            (char instanceof RegExp && !char.test(str[index]))
        ) {
            return afterIndex + 1 + index;
        }
    }
    return -1;
};

// 标签头部是否闭合，<node name="sdf" 缺少“>”即表示未闭合
const nodeIsClose = (node: LxNode): boolean => {
    return (
        node.selfcloseing ||
        !!(node.locationInfo.startTag && node.locationInfo.endTag)
    );
};

const pushElement = (node: LxNode, arg: LxParseArg) => {
    if (arg.currentNode && arg.currentNode.type === LxNodeType.element) {
        if (!arg.currentNode.children) {
            arg.currentNode.children = [];
        }
        arg.currentNode.children.push(node);
        node.parent = arg.currentNode;
        if (
            node.type === LxNodeType.text ||
            (node.type === LxNodeType.element && !nodeIsClose(node))
        ) {
            arg.currentNode = node;
        }
        return;
    }
    if (
        node.type === LxNodeType.text ||
        (node.type === LxNodeType.element && !nodeIsClose(node))
    ) {
        arg.currentNode = node;
    }
    arg.nodes.push(node);
};
const plusArgNumber = (
    arg: LxParseArg,
    index?: number,
    linePlus?: number,
    colPlus?: number
) => {
    if (index) {
        arg.index += index;
    }
    if (linePlus) {
        arg.line += linePlus;
    }
    if (colPlus) {
        arg.col += colPlus;
        arg.col = Math.abs(arg.col);
    }
    if (linePlus || colPlus) {
        arg.maxLine = arg.line;
        if (arg.maxCol < arg.col) {
            arg.maxCol = arg.col;
        }
    }
};

const parseStartTag = (startIndex: number, arg: LxParseArg) => {
    const { xml, xmlLength } = arg;
    let selfCloseing;
    let isComment;
    let tagName = "";
    const startTag: LxLocation = {
        startLine: arg.line,
        startCol: arg.col,
        startOffset: arg.index,
    };
    let endTag: LxLocation;

    if (arg.xml.substr(startIndex, 4) === "<!--") {
        isComment = true;
        plusArgNumber(arg, 4, 0, 3);
        startTag.endLine = arg.line;
        startTag.endCol = arg.col;
        startTag.endOffset = arg.index;
    } else {
        plusArgNumber(arg, 1);
    }
    for (; arg.index < xmlLength; arg.index++) {
        plusArgNumber(arg, 0, 0, 1);
        const char = xml[arg.index];
        if (isComment) {
            if (char === "-" && arg.xml.substr(arg.index, 3) === "-->") {
                endTag = {
                    startLine: arg.line,
                    startCol: arg.col,
                    startOffset: arg.index,
                };
                plusArgNumber(arg, 3, 0, 2);
                endTag.endLine = arg.line;
                endTag.endCol = arg.col;
                endTag.endOffset = arg.index;
                break;
            }
            tagName += char;
            if (char === "\n") {
                plusArgNumber(arg, 0, 1, -arg.col);
            }
            if (arg.index === xmlLength - 1) {
                return throwError(TAG_NOT_CLOSE, arg.line, arg.col);
            }
        } else {
            if (RexSpace.test(char)) {
                if (arg.index > startIndex && tagName) {
                    break;
                }
                if (!arg.options || !arg.options.ignoreNearTagNameSpace) {
                    return throwError(
                        TAG_BOUNDARY_CHAR_HAS_SPACE,
                        arg.line,
                        arg.col
                    );
                }
                if (char === "\n") {
                    plusArgNumber(arg, 0, 1, -arg.col);
                }
                if (arg.index === xmlLength - 1) {
                    return throwError(TAG_NAME_IS_EMPTY, arg.line, arg.col);
                }
            }
            if (char === "<") {
                return throwError(
                    TAG_HAS_MORE_BOUNDARY_CHAR,
                    arg.line,
                    arg.col
                );
            }
            if (char === ">") {
                startTag.endLine = arg.line;
                startTag.endCol = arg.col;
                startTag.endOffset = arg.index;
                break;
            }
            if (char === "/" && xml[arg.index + 1] === ">") {
                selfCloseing = true;
                startTag.endLine = arg.line;
                startTag.endCol = arg.col;
                startTag.endOffset = arg.index;
                plusArgNumber(arg, 1, 0, 1);
                break;
            }
            if (arg.index === xmlLength - 1) {
                return throwError(TAG_NOT_CLOSE, arg.line, arg.col);
            }
            tagName += char;
        }
    }
    if (!isComment && !tagName) {
        return throwError(
            TAG_NAME_IS_EMPTY,
            startTag.startLine,
            startTag.startCol
        );
    }
    const node: LxNode = {
        type: isComment ? LxNodeType.comment : LxNodeType.element,
        locationInfo: {
            startLine: startTag.startLine,
            startCol: startTag.startCol,
            startOffset: startTag.startOffset,
            startTag,
        },
    };
    if (isComment) {
        node.content = tagName;
        node.locationInfo.endTag = endTag;
        node.locationInfo.endLine = endTag.endLine;
        node.locationInfo.endCol = endTag.endCol;
        node.locationInfo.endOffset = endTag.endOffset;
        return pushElement(node, arg);
    }
    node.name = tagName;
    if (selfCloseing) {
        node.selfcloseing = true;
        startTag.endLine = node.locationInfo.endLine = startTag.endLine;
        startTag.endCol = node.locationInfo.endCol = startTag.endCol;
        startTag.endOffset = node.locationInfo.endOffset = startTag.endOffset;
        return pushElement(node, arg);
    }
    const attrs = parseAttrs(arg, node);
    if (attrs.length) {
        node.attrs = attrs;
        node.locationInfo.attrs = {};
        attrs.forEach((attr) => {
            attr.parent = node;
            node.locationInfo.attrs[attr.name] = attr.locationInfo;
        });
    }
    return pushElement(node, arg);
};

const parseEndTag = (startIndex: number, arg: LxParseArg) => {
    const { xml, xmlLength } = arg;
    const endTag: LxLocation = {
        startLine: arg.line,
        startCol: arg.col,
        startOffset: startIndex,
    };
    plusArgNumber(arg, 1);
    let value = "";
    for (; arg.index < xmlLength; arg.index++) {
        plusArgNumber(arg, 0, 0, 1);
        const char = xml[arg.index];
        if (char === "<") {
            return throwError(TAG_HAS_MORE_BOUNDARY_CHAR, arg.line, arg.col);
        }
        if (char === ">") {
            if (value !== arg.currentNode.name) {
                if (
                    !(
                        arg.options &&
                        arg.options.ignoreTagNameCaseEqual &&
                        value.toLowerCase() ===
                            arg.currentNode.name.toLowerCase()
                    )
                ) {
                    return throwError(TAG_NAME_NOT_EQUAL, arg.line, arg.col);
                }
            }
            arg.currentNode.locationInfo.endOffset = endTag.endOffset =
                arg.index;
            arg.currentNode.locationInfo.endCol = endTag.endCol = arg.col;
            arg.currentNode.locationInfo.endLine = endTag.endLine = arg.line;
            arg.currentNode.locationInfo.endTag = endTag;
            if (arg.currentNode.parent) {
                arg.currentNode = arg.currentNode.parent;
            } else {
                delete arg.currentNode;
            }
            break;
        }
        if (char !== "/") {
            value += char;
        }
    }
};

enum LxParseAttrTarget {
    name = "name",
    equal = "equal",
    leftBoundary = "leftBoundary",
    content = "content",
}

const parseAttrs = (arg: LxParseArg, element: LxNode): LxNode[] => {
    const { xml, xmlLength } = arg;
    arg.index++;
    const attrs = [] as LxNode[];
    let currentAttr: LxNode;
    let value;
    let findTarget: LxParseAttrTarget; // 表示正在寻找某目标，而不是当前已经是某目标
    let leftBoundaryValue = "";
    for (; arg.index < xmlLength; arg.index++) {
        arg.col++;
        const char = xml[arg.index];
        if (char === "\n") {
            if (findTarget === LxParseAttrTarget.name && value) {
                currentAttr.name = value;
                currentAttr.locationInfo.endOffset = arg.index;
                currentAttr.locationInfo.endLine = arg.line;
                currentAttr.locationInfo.endCol = arg.col;
                value = undefined;
                findTarget = LxParseAttrTarget.equal;
                plusArgNumber(arg, 0, 1, -arg.col);
                continue;
            }
            if (findTarget === LxParseAttrTarget.content) {
                return throwError(ATTR_CONTENT_HAS_BR, arg.line, arg.col);
            }
            plusArgNumber(arg, 0, 1, -arg.col);
            continue;
        }
        if (RexSpace.test(char)) {
            if (!findTarget) {
                continue;
            }
            if (
                findTarget === LxParseAttrTarget.equal ||
                findTarget === LxParseAttrTarget.leftBoundary
            ) {
                currentAttr.locationInfo.endOffset = arg.index;
                currentAttr.locationInfo.endLine = arg.line;
                currentAttr.locationInfo.endCol = arg.col;
                attrs.push(currentAttr);
                leftBoundaryValue = currentAttr = findTarget = value = undefined;
                continue;
            }
            if (
                findTarget === LxParseAttrTarget.content &&
                !leftBoundaryValue
            ) {
                if (value) {
                    currentAttr.content = value;
                }
                currentAttr.locationInfo.endOffset = arg.index;
                currentAttr.locationInfo.endLine = arg.line;
                currentAttr.locationInfo.endCol = arg.col;
                attrs.push(currentAttr);
                leftBoundaryValue = currentAttr = findTarget = value = undefined;
                continue;
            }
            if (findTarget === LxParseAttrTarget.name) {
                if (!value) {
                    continue;
                }
                currentAttr.name = value;
                currentAttr.locationInfo.endOffset = arg.index;
                currentAttr.locationInfo.endLine = arg.line;
                currentAttr.locationInfo.endCol = arg.col;
                value = undefined;
                findTarget = LxParseAttrTarget.equal;
                continue;
            }
        }
        if (char === "=") {
            if (findTarget === LxParseAttrTarget.name) {
                if (!value) {
                    return throwError(ATTR_NAME_IS_EMPTY, arg.line, arg.col);
                }
                currentAttr.name = value;
                currentAttr.locationInfo.endOffset = arg.index;
                currentAttr.locationInfo.endLine = arg.line;
                currentAttr.locationInfo.endCol = arg.col;
                value = undefined;
                findTarget = LxParseAttrTarget.leftBoundary;
                continue;
            }
            if (findTarget === LxParseAttrTarget.equal) {
                findTarget = LxParseAttrTarget.leftBoundary;
                continue;
            }
            if (findTarget === LxParseAttrTarget.leftBoundary) {
                return throwError(ATTR_HAS_MORE_EQUAL, arg.line, arg.col);
            }
        }
        if (char === "'" || char === '"') {
            if (findTarget === LxParseAttrTarget.name) {
                return throwError(ATTR_NAME_IS_WRONG, arg.line, arg.col);
            }
            if (findTarget === LxParseAttrTarget.equal) {
                return throwError(ATTR_IS_WRONG, arg.line, arg.col);
            }
            if (findTarget === LxParseAttrTarget.leftBoundary) {
                currentAttr.hasQuotationMarks = true;
                findTarget = LxParseAttrTarget.content;
                leftBoundaryValue = char;
                continue;
            }
            if (findTarget === LxParseAttrTarget.content) {
                if (leftBoundaryValue === char) {
                    currentAttr.content = value;
                    currentAttr.locationInfo.endOffset = arg.index;
                    currentAttr.locationInfo.endLine = arg.line;
                    currentAttr.locationInfo.endCol = arg.col;
                    attrs.push(currentAttr);
                    leftBoundaryValue = currentAttr = findTarget = value = undefined;
                    continue;
                }
            }
        }
        if (char === ">") {
            if (!findTarget) {
                element.locationInfo.startTag.endOffset = arg.index;
                element.locationInfo.startTag.endLine = arg.line;
                element.locationInfo.startTag.endCol = arg.col;
                break;
            }
        }
        if (char === "/" && xml[arg.index + 1] === ">" && !findTarget) {
            element.locationInfo.startTag.endOffset = arg.index;
            element.locationInfo.startTag.endLine = arg.line;
            element.locationInfo.startTag.endCol = arg.col;
            element.selfcloseing = true;
            element.locationInfo.endOffset = arg.index;
            element.locationInfo.endLine = arg.line;
            element.locationInfo.endCol = arg.col;
            plusArgNumber(arg, 1, 0, 1);
            break;
        }
        if (
            findTarget === LxParseAttrTarget.equal ||
            findTarget === LxParseAttrTarget.leftBoundary
        ) {
            if (!currentAttr.locationInfo.endOffset) {
                currentAttr.locationInfo.endOffset = arg.index;
                currentAttr.locationInfo.endLine = arg.line;
                currentAttr.locationInfo.endCol = arg.col;
            }
            attrs.push(currentAttr);
            leftBoundaryValue = currentAttr = findTarget = value = undefined;
            continue;
        }
        if (!findTarget) {
            findTarget = LxParseAttrTarget.name;
            currentAttr = {
                type: LxNodeType.attr,
                locationInfo: {
                    startLine: arg.line,
                    startCol: arg.col,
                    startOffset: arg.index,
                },
            } as LxNode;
        }
        if (!value) {
            value = "";
        }
        value += char;
    }
    return attrs;
};

const loopParse = (arg: LxParseArg): LxParseArg => {
    const { xml, xmlLength } = arg;
    for (; arg.index < xmlLength; arg.index++) {
        const char = xml[arg.index];
        if (char === "<") {
            if (!arg.currentNode) {
                parseStartTag(arg.index, arg);
                continue;
            }
            if (arg.currentNode.type === LxNodeType.element) {
                if (xml[arg.index + 1] === "/") {
                    parseEndTag(arg.index, arg);
                    continue;
                }
                parseStartTag(arg.index, arg);
                continue;
            }
            if (arg.currentNode.type === LxNodeType.text) {
                arg.currentNode.locationInfo.endCol = arg.col;
                arg.currentNode.locationInfo.endLine = arg.line;
                arg.currentNode.locationInfo.endOffset = arg.index;
                if (arg.currentNode.parent) {
                    arg.currentNode = arg.currentNode.parent;
                    if (xml[arg.index + 1] === "/") {
                        parseEndTag(arg.index, arg);
                        continue;
                    }
                } else {
                    delete arg.currentNode;
                }
                parseStartTag(arg.index, arg);
                continue;
            }
        }

        if (!arg.currentNode) {
            pushElement(
                {
                    type: LxNodeType.text,
                    content: char,
                    locationInfo: {
                        startLine: arg.line,
                        startCol: arg.col,
                        startOffset: arg.index,
                    },
                },
                arg
            );
            if (char === "\n") {
                plusArgNumber(arg, 0, 1, -(arg.col + 1));
            } else {
                plusArgNumber(arg, 0, 0, 1);
            }
            continue;
        }
        if (arg.currentNode.type === LxNodeType.element) {
            const node: LxNode = {
                type: LxNodeType.text,
                content: char,
                locationInfo: {
                    startLine: arg.line,
                    startCol: arg.col,
                    startOffset: arg.index,
                },
            };
            pushElement(node, arg);
            if (char === "\n") {
                plusArgNumber(arg, 0, 1, -(arg.col + 1));
            } else {
                plusArgNumber(arg, 0, 0, 1);
            }
            continue;
        }

        arg.currentNode.content += char;
    }
    return arg;
};

export const parse = (xml: string, options?: LxParseOptions): LxParseResult => {
    const xmlRows = xml.split("\n");
    const arg = {
        index: 0,
        xmlLength: xml.length,
        xml,
        xmlRows,
        maxLine: xmlRows.length,
        maxCol: 0,
        line: 1,
        col: 1,
        nodes: [],
        options,
    };
    try {
        loopParse(arg);
        return {
            xml,
            xmlRows,
            maxLine: arg.maxLine,
            maxCol: arg.maxCol,
            nodes: arg.nodes,
        } as LxParseResult;
    } catch (error) {
        return {
            error,
            xml,
            xmlRows,
        } as LxParseResult;
    }
};

const pick = (
    prop: string,
    res: LxParseResultJSON,
    parseResult: LxParseResult,
    options?: LxToJSONOptions
) => {
    if (options && options[prop]) {
        res[prop] = parseResult[prop];
    }
};
const nodeToJSON = (node: LxNode, needLocation: boolean): LxNodeJSON => {
    const res = {} as LxNodeJSON;
    for (let prop in node) {
        if (prop !== "parent") {
            if (prop !== "locationInfo") {
                if (prop === "attrs" || prop === "children") {
                    res[prop] = node[prop].map((item) =>
                        nodeToJSON(item, needLocation)
                    );
                } else {
                    res[prop] = node[prop];
                }
            } else if (needLocation) {
                res[prop] = JSON.parse(JSON.stringify(node[prop]));
            }
        }
    }
    return res;
};

export const parseResultToJSON = (
    parseResult: LxParseResult,
    options?: LxToJSONOptions
): LxParseResultJSON => {
    const res: LxParseResultJSON = {
        error: parseResult.error,
    };
    pick("maxLine", res, parseResult, options);
    pick("maxCol", res, parseResult, options);
    pick("xml", res, parseResult, options);
    pick("xmlRows", res, parseResult, options);
    if (!parseResult.error) {
        res.nodes = parseResult.nodes.map((node) =>
            nodeToJSON(node, !!(options && options.locationInfo))
        );
    }
    return res;
};
