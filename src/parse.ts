import {
    LxParseArg,
    LxNodeType,
    LxParseOptions,
    LxParseResult,
    LxParseResultJSON,
    LxToJSONOptions,
} from "./types";
import {
    pick,
    nodeToJSON,
    plusArgNumber,
    lxWrongToJSON,
    pushElement,
    checkLineBreak,
    getNodeType,
    equalSubStr,
    execLoopHook,
    initNode,
} from "./util";
import { ALONE_NODE_MAP, ELEMENT_END, PI_END } from "./var";
import { parseAloneNode } from "./node-alone";
import {
    closeNode,
    maybeNewNoTextNode,
    parseEndTag,
    parseStartTag,
    pushNode,
} from "./node";

const loopClose = (arg: LxParseArg) => {
    const node = arg.currentNode;
    if (node.type !== LxNodeType.text && !node.locationInfo.endTag) {
        closeNode(node, arg);
    }
    if (node.parent) {
        arg.currentNode = node.parent;
        return loopClose(arg);
    }
};

const loopParse = (arg: LxParseArg): LxParseArg => {
    const { xml, xmlLength } = arg;
    for (; arg.index < xmlLength; plusArgNumber(arg, 1, 0, 1)) {
        if (!arg.maxLine) {
            arg.maxLine = 1;
        }
        const hookResult = execLoopHook(arg);
        if (hookResult === 1) {
            continue;
        }
        if (hookResult === 2) {
            break;
        }
        if (maybeNewNoTextNode(arg)) {
            const nodeType = getNodeType(arg);
            if (ALONE_NODE_MAP[nodeType]) {
                parseAloneNode(nodeType, arg);
                continue;
            }
            parseStartTag(arg);
            continue;
        }
        const char = xml[arg.index];
        if (char === "<") {
            if (
                arg.currentNode.type === LxNodeType.element &&
                equalSubStr(xml, arg.index, ELEMENT_END)
            ) {
                parseEndTag(arg.index, arg);
                continue;
            }
        }
        if (
            char === "]" &&
            (arg.currentNode.type === LxNodeType.dtd ||
                (arg.currentNode.parent &&
                    arg.currentNode.parent.type === LxNodeType.dtd))
        ) {
            parseEndTag(arg.index, arg);
            continue;
        }
        if (!arg.currentNode) {
            pushNode(initNode(LxNodeType.text, arg), arg);
        }
        if (arg.currentNode.type !== LxNodeType.text) {
            const node = initNode(LxNodeType.text, arg);
            node.content = char;
            pushNode(node, arg);
            checkLineBreak(arg);
            continue;
        }
        arg.currentNode.content += char;
        checkLineBreak(arg);
    }
    if (arg.currentNode) {
        loopClose(arg);
        delete arg.currentNode;
    }
    return arg;
};

export const parse = (xml: string, options?: LxParseOptions): LxParseResult => {
    const arg = {
        index: 0,
        xmlLength: xml.length,
        xml,
        maxLine: 0,
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
            maxLine: arg.maxLine,
            maxCol: arg.maxCol,
            nodes: arg.nodes,
        } as LxParseResult;
    } catch (error) {
        return {
            error,
            xml,
        } as LxParseResult;
    }
};

export const parseResultToJSON = (
    parseResult: LxParseResult,
    options?: LxToJSONOptions
): LxParseResultJSON => {
    const res: LxParseResultJSON = {};
    if (parseResult.error) {
        res.error = lxWrongToJSON(parseResult.error);
    }
    if (parseResult.warnings) {
        res.warnings = parseResult.warnings.map((item) => lxWrongToJSON(item));
    }
    pick("maxLine", res, parseResult, options);
    pick("maxCol", res, parseResult, options);
    pick("xml", res, parseResult, options);
    if (!parseResult.error) {
        res.nodes = parseResult.nodes.map((node) =>
            nodeToJSON(node, !!(options && options.locationInfo))
        );
    }
    return res;
};
