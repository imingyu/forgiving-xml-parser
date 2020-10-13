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

export const checkLineBreak = (arg: LxParseArg, plusNumber = true): boolean => {
    const char = arg.xml[arg.index];
    if (char === "\n") {
        plusNumber && plusArgNumber(arg, 0, 1, -arg.col);
        debugger;
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

export function isTrueOption(
    arg: LxParseArg,
    prop: LxParseOptionsKeys
): boolean {
    return !!(arg.options && arg.options[prop]);
}
export function equalOption(
    arg: LxParseArg,
    prop: LxParseOptionsKeys,
    value: any,
    defaultValue?: any
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
