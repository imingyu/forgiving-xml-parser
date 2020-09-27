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
} from "./types";
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
        throw err;
    }
    const checkResult = arg.options.checkError(err, arg);
    if (checkResult === true) {
        throw err;
    }
    err.customIgnore = checkResult;
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
    return json;
};

export const fireEvent = (type: LxEventType, arg: LxParseArg, data: any) => {
    arg.options &&
        typeof arg.options.onEvent === "function" &&
        arg.options.onEvent(type, arg, data);
};

export const checkLineBreak = (arg: LxParseArg): boolean => {
    const char = arg.xml[arg.index];
    if (char === "\n") {
        return true;
    }
    if (char === "\r" && arg.xml[arg.index + 1] === "\n") {
        arg.index++;
        arg.col++;
        return true;
    }
    return false;
};
