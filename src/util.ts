import {
    LxNode,
    LxParseArg,
    LxNodeType,
    LxParseResult,
    LxParseResultJSON,
    LxToJSONOptions,
    LxNodeJSON,
    LxMessage,
    LxWrong,
    LxEventType,
    LxParseOptionsKeys,
    LxEacher,
    LxParseOptions,
} from "./types";
import {
    ALONE_NODE_MAP,
    CDATA_END,
    CDATA_START,
    COMMENT_END,
    COMMENT_START,
    DTD_END,
    DTD_START,
    PI_END,
    PI_START,
} from "./var";
export const throwError = (
    msg: LxMessage,
    arg: LxParseArg,
    line?: number,
    col?: number,
    detail?: string
) => {
    const err = (new Error(msg.message) as unknown) as LxWrong;
    err.code = msg.code;
    err.line = line || arg.line;
    err.col = col || arg.col;
    if (detail) {
        err.detail = detail;
    }
    if (
        !arg.options ||
        !arg.options.checkError ||
        typeof arg.options.checkError !== "function"
    ) {
        fireEvent(LxEventType.error, arg, err);
        throw err;
    }
    const checkResult = arg.options.checkError(err, arg);
    if (checkResult === true) {
        fireEvent(LxEventType.error, arg, err);
        throw err;
    }
    err.customIgnore = checkResult;
    fireEvent(LxEventType.warn, arg, err);
    addWarn(arg, err);
};

export const addWarn = (arg: LxParseArg, warn: LxWrong | LxMessage) => {
    if (!arg.warnings) {
        arg.warnings = [];
    }
    if ("line" in warn) {
        arg.warnings.push(warn);
        return;
    }
    const tsWarn = warn as LxWrong;
    tsWarn.line = arg.line;
    tsWarn.col = arg.col;
    arg.warnings.push(tsWarn);
};

// 标签头部是否闭合，<node name="sdf" 缺少“>”即表示未闭合
export const nodeIsClose = (node: LxNode): boolean => {
    return (
        node.selfcloseing ||
        !!(node.locationInfo.startTag && node.locationInfo.endTag)
    );
};

export const pushElement = (node: LxNode, arg: LxParseArg) => {
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
export const plusArgNumber = (
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
        if (arg.line > arg.maxLine) {
            arg.maxLine = arg.line;
        }
        if (arg.maxCol < arg.col) {
            arg.maxCol = arg.col;
        }
    }
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
export const nodeToJSON = (node: LxNode, needLocation: boolean): LxNodeJSON => {
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

export const lxWrongToJSON = (wrong: LxWrong): LxWrong => {
    const json = JSON.parse(JSON.stringify(wrong));
    json.message = wrong.message;
    json.stack = wrong.stack;
    return json;
};

export const fireEvent = (type: LxEventType, arg: LxParseArg, data: any) => {
    // console.log(type, data);
    // arg.options &&
    //     typeof arg.options.onEvent === "function" &&
    //     arg.options.onEvent(type, arg, data);
};

export const checkLineBreak = (arg: LxParseArg, plusNumber = true): boolean => {
    const char = arg.xml[arg.index];
    if (char === "\n") {
        plusNumber && plusArgNumber(arg, 0, 1, -arg.col);
        return true;
    }
    if (char === "\r" && arg.xml[arg.index + 1] === "\n") {
        if (plusNumber) {
            plusArgNumber(arg, 1, 1, 1);
            plusArgNumber(arg, 0, 0, -arg.col);
        }
        return true;
    }
    return false;
};

export const allowNodeNotClose = (arg: LxParseArg, node: LxNode): boolean => {
    if (isTrueOption(arg, "allowNodeNotClose")) {
        if (arg.options.allowNodeNotClose instanceof RegExp) {
            return arg.options.allowNodeNotClose.test(node.name);
        }
        if (typeof arg.options.allowNodeNotClose === "function") {
            return arg.options.allowNodeNotClose(node, arg);
        }
        return arg.options.allowNodeNotClose === true;
    }
    return false;
};

export function isTrueOption(
    arg: LxParseArg,
    prop: LxParseOptionsKeys
): boolean {
    return !!(arg.options && arg.options[prop]);
}

export function equalOption<P extends keyof LxParseOptions>(
    arg: LxParseArg,
    prop: P,
    value: LxParseOptions[P],
    defaultValue?: LxParseOptions[P]
): boolean {
    if (arg.options) {
        if (arg.options[prop]) {
            return arg.options[prop] === value;
        }
        return value === defaultValue;
    }
    return value === defaultValue;
}
export const equalTagName = (
    arg: LxParseArg,
    node: LxNode,
    endTagName: string
) => {
    if (node.type === LxNodeType.element) {
        const startTagName = node.name;
        const lowerStartTagName = startTagName.toLowerCase();
        if (endTagName !== startTagName) {
            if (
                !isTrueOption(arg, "ignoreTagNameCaseEqual") ||
                endTagName.toLowerCase() !== lowerStartTagName
            ) {
                return false;
            }
        }
    }
    return true;
};

export const lxEach = (arg: LxParseArg, handler: LxEacher) => {
    const { xmlLength } = arg;
    for (; arg.index < xmlLength; arg.index++) {
        handler(
            arg,
            () => {
                arg.continueEach = true;
            },
            () => {
                arg.breakEach = true;
            }
        );
        if (arg.continueEach) {
            delete arg.continueEach;
            continue;
        }
        if (arg.breakEach) {
            delete arg.breakEach;
            break;
        }
    }
};

export const execEndTag = (arg: LxParseArg, node: LxNode) => {
    node.locationInfo.endTag = {
        startCol: arg.col,
        startOffset: arg.index,
        startLine: arg.line,
    };
    fireEvent(LxEventType.endTagStart, arg, node);
    if (node.type === LxNodeType.cdata) {
        plusArgNumber(arg, CDATA_END.length - 1, 0, CDATA_END.length - 1);
    } else if (node.type === LxNodeType.processingInstruction) {
        plusArgNumber(arg, PI_END.length - 1, 0, PI_END.length - 1);
    } else if (node.type === LxNodeType.comment) {
        plusArgNumber(arg, COMMENT_END.length - 1, 0, COMMENT_END.length - 1);
    }
    node.locationInfo.endTag.endCol = node.locationInfo.endCol = arg.col;
    node.locationInfo.endTag.endLine = node.locationInfo.endLine = arg.line;
    node.locationInfo.endTag.endOffset = node.locationInfo.endOffset =
        arg.index;
    fireEvent(LxEventType.endTagEnd, arg, node);
    fireEvent(LxEventType.nodeEnd, arg, node);
};

export const initNode = (type: LxNodeType, arg: LxParseArg): LxNode => {
    const node: LxNode = {
        type,
        locationInfo: {
            startLine: arg.line,
            startCol: arg.col,
            startOffset: arg.index,
        },
    };
    if (type === LxNodeType.attr) {
        node.equalCount = 0;
    }
    if (type !== LxNodeType.text) {
        node.locationInfo.startTag = {
            startLine: arg.line,
            startCol: arg.col,
            startOffset: arg.index,
        };
    }
    fireEvent(LxEventType.nodeStart, arg, node);
    if (type === LxNodeType.text) {
        node.content = "";
        fireEvent(LxEventType.nodeContentStart, arg, node);
        return node;
    }
    fireEvent(LxEventType.startTagStart, arg, node);
    if (type === LxNodeType.element) {
        plusArgNumber(arg, 1, 0, 1);
        fireEvent(LxEventType.nodeNameStart, arg, node);
        return node;
    }
    if (type === LxNodeType.processingInstruction) {
        plusArgNumber(arg, PI_START.length, 0, PI_START.length);
        fireEvent(LxEventType.nodeNameStart, arg, node);
        return node;
    }
    if (type === LxNodeType.dtd) {
        plusArgNumber(arg, DTD_START.length, 0, DTD_START.length);
        fireEvent(LxEventType.nodeNameStart, arg, node);
        return node;
    }
    if (type === LxNodeType.comment) {
        plusArgNumber(arg, COMMENT_START.length, 0, COMMENT_START.length);
        node.locationInfo.startTag.endLine = arg.line;
        node.locationInfo.startTag.endCol = arg.col;
        node.locationInfo.startTag.endOffset = arg.index;
        fireEvent(LxEventType.startTagEnd, arg, node);
        node.content = "";
        fireEvent(LxEventType.nodeContentStart, arg, node);
        return node;
    }
    if (type === LxNodeType.cdata) {
        plusArgNumber(arg, CDATA_START.length, 0, CDATA_START.length);
        node.locationInfo.startTag.endLine = arg.line;
        node.locationInfo.startTag.endCol = arg.col;
        node.locationInfo.startTag.endOffset = arg.index;
        fireEvent(LxEventType.startTagEnd, arg, node);
        node.content = "";
        fireEvent(LxEventType.nodeContentStart, arg, node);
        return node;
    }
    return node;
};

export const checkNodeContentEnd = (arg: LxParseArg, content?: string) => {
    const { currentNode, xmlLength } = arg;
    let isEnd;
    if (
        ALONE_NODE_MAP[currentNode.type] &&
        equalSubStr(arg.xml, arg.index + 1, ALONE_NODE_MAP[currentNode.type])
    ) {
        isEnd = true;
    }
    if (arg.index === xmlLength - 1) {
        isEnd = true;
    }
    if (isEnd) {
        if (content) {
            currentNode.content = content;
        }
        fireEvent(LxEventType.nodeContentEnd, arg, currentNode);
    }
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

export const getNodeType = (arg: LxParseArg): LxNodeType => {
    if (equalSubStr(arg.xml, arg.index, CDATA_START)) {
        return LxNodeType.cdata;
    }
    if (equalSubStr(arg.xml, arg.index, COMMENT_START)) {
        return LxNodeType.comment;
    }
    if (equalSubStr(arg.xml, arg.index, PI_START)) {
        return LxNodeType.processingInstruction;
    }
    if (equalSubStr(arg.xml, arg.index, DTD_START)) {
        return LxNodeType.dtd;
    }
    return LxNodeType.element;
};

export const execLoopHook = (arg: LxParseArg): number => {
    if (arg.options && typeof arg.options.loopHook === "function") {
        return arg.options.loopHook(arg);
    }
};
