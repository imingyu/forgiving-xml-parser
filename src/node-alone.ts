import { execStartTagEnd, pushNode } from "./node";
import { LxNodeType, LxParseArg } from "./types";
import {
    checkLineBreak,
    checkNodeContentEnd,
    equalSubStr,
    execLoopHook,
    initNode,
    plusArgNumber,
} from "./util";
import { ALONE_NODE_MAP } from "./var";

export const parseAloneNode = (nodeType: LxNodeType, arg: LxParseArg) => {
    const { xml, xmlLength } = arg;
    const aloneNodeEndStr = ALONE_NODE_MAP[nodeType];
    const node = initNode(nodeType, arg);
    let afterAction = pushNode(node, arg);
    for (; arg.index < xmlLength; plusArgNumber(arg, 1, 0, 1)) {
        const hookResult = execLoopHook(arg);
        if (hookResult === 1) {
            continue;
        }
        if (hookResult === 2) {
            break;
        }
        const char = xml[arg.index];
        if (
            char === aloneNodeEndStr[0] &&
            equalSubStr(arg.xml, arg.index, aloneNodeEndStr)
        ) {
            execStartTagEnd(arg);
            break;
        }
        node.content += char;
        checkLineBreak(arg);
        checkNodeContentEnd(arg);
    }
    if (afterAction === "clear") {
        delete arg.currentNode;
        return;
    }
    arg.currentNode = arg.currentNode.parent;
};
