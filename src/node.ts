import {
    LxNode,
    LxParseArg,
    LxNodeType,
    LxLocation,
    LxParseAttrTarget,
    LxEventType,
    AttrMoreEqualDisposal,
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
    ATTR_EQUAL_NEAR_SPACE,
    TAG_NAME_NOT_EQUAL,
} from "./message";
import {
    plusArgNumber,
    pushElement,
    throwError,
    fireEvent,
    checkLineBreak,
    isTrueOption,
    equalTagName,
    equalOption,
    initNode,
    execLoopHook,
    allowNodeNotClose,
    getNodeType,
    equalSubStr,
} from "./util";
import { CDATA_END, COMMENT_END, PI_END, REX_SPACE } from "./var";

export const maybeNewNoTextNode = (arg: LxParseArg): boolean => {
    const char = arg.xml[arg.index];
    if (char === "<") {
        if (arg.currentNode) {
            if (
                arg.currentNode.type === LxNodeType.comment ||
                arg.currentNode.type === LxNodeType.cdata
            ) {
                return false;
            }
            return true;
        }
        return true;
    }
    return false;
};

export const pushNode = (
    node: LxNode,
    arg: LxParseArg
): "clear" | "parent" | void => {
    if (node.type === LxNodeType.attr) {
        if (!arg.currentNode.attrs) {
            arg.currentNode.attrs = [];
        }
        if (!arg.currentNode.locationInfo.attrs) {
            arg.currentNode.locationInfo.attrs = [];
        }
        arg.currentNode.attrs.push(node);
        arg.currentNode.locationInfo.attrs.push(node.locationInfo);
        return;
    }
    let afterAction;
    if (!arg.currentNode) {
        arg.currentNode = node;
        arg.nodes.push(node);
        afterAction = "clear";
    } else if (arg.currentNode.type === LxNodeType.text) {
        if (arg.currentNode.parent) {
            node.parent = arg.currentNode.parent;
            arg.currentNode.parent.children.push(node);
            arg.currentNode = node;
            afterAction = "parent";
        } else {
            arg.currentNode = node;
            arg.nodes.push(node);
            afterAction = "clear";
        }
    } else {
        node.parent = arg.currentNode;
        if (!arg.currentNode.children) {
            arg.currentNode.children = [];
        }
        arg.currentNode.children.push(node);
        arg.currentNode = node;
        afterAction = "parent";
    }
    return afterAction;
};

export const execStartTagEnd = (arg: LxParseArg) => {
    const currentNode = arg.currentNode;
    if (currentNode.selfcloseing) {
        plusArgNumber(arg, 1, 0, 1);
    }
    if (currentNode.type === LxNodeType.comment) {
        plusArgNumber(arg, COMMENT_END.length - 1, 0, COMMENT_END.length - 1);
    }
    if (currentNode.type === LxNodeType.cdata) {
        plusArgNumber(arg, CDATA_END.length - 1, 0, CDATA_END.length - 1);
    }
    if (currentNode.type === LxNodeType.processingInstruction) {
        plusArgNumber(arg, PI_END.length - 1, 0, PI_END.length - 1);
    }
    currentNode.locationInfo.startTag.endLine = arg.line;
    currentNode.locationInfo.startTag.endCol = arg.col;
    currentNode.locationInfo.startTag.endOffset = arg.index;
    fireEvent(LxEventType.startTagEnd, arg, currentNode);
    currentNode.selfcloseing &&
        fireEvent(LxEventType.nodeEnd, arg, currentNode);
};

/**
 * 解析并设置当前元素（type=element|pi|dtd）的标签名称，并在正确的条件下触发事件、设置位置信息、关闭当前node、但不会重新设定当前node
 * @param {LxParseArg} arg
 * @returns {boolean} 是否需要继续解析attrs
 */
export const parseTagName = (arg: LxParseArg) => {
    const { currentNode, xmlLength, xml } = arg;
    const startIndex = arg.index;
    let startTagClosed;
    let tagName = "";
    for (; arg.index < xmlLength; plusArgNumber(arg, 1, 0, 1)) {
        const hookResult = execLoopHook(arg);
        if (hookResult === 1) {
            continue;
        }
        if (hookResult === 2) {
            break;
        }
        const char = xml[arg.index];
        if (REX_SPACE.test(char)) {
            if (arg.index > startIndex && tagName) {
                currentNode.name = tagName;
                fireEvent(LxEventType.nodeNameEnd, arg, currentNode);
                plusArgNumber(arg, 1, 0, 1);
                break;
            }
            if (!isTrueOption(arg, "allowNearTagNameSpace")) {
                throwError(TAG_BOUNDARY_CHAR_HAS_SPACE, arg);
            }
            checkLineBreak(arg);
            continue;
        }
        if (char === "<") {
            throwError(TAG_HAS_MORE_BOUNDARY_CHAR, arg);
        }
        let attrsEndPlus = 0;
        if ((attrsEndPlus = checkAttrsEnd(arg))) {
            if (tagName) {
                currentNode.name = tagName;
            }
            startTagClosed = true;
            fireEvent(LxEventType.nodeNameEnd, arg, currentNode);
            if (currentNode.type === LxNodeType.element && attrsEndPlus === 2) {
                currentNode.selfcloseing = true;
            }
            execStartTagEnd(arg);
            break;
        }
        tagName += char;
        if (arg.index === xmlLength - 1) {
            currentNode.notClose = true;
            if (tagName) {
                currentNode.name = tagName;
            }
            fireEvent(LxEventType.nodeNameEnd, arg, currentNode);
            execStartTagEnd(arg);
        }
    }
    if (currentNode.selfcloseing || currentNode.notClose || startTagClosed) {
        return;
    }
    return true;
};

export const parseStartTag = (arg: LxParseArg, nodeType?: LxNodeType) => {
    nodeType = nodeType || getNodeType(arg);
    const node = initNode(nodeType, arg);
    pushNode(node, arg);
    if (parseTagName(arg)) {
        fireEvent(LxEventType.attrsStart, arg, node);
        parseAttrs(arg);
    }
    if (node.type === LxNodeType.dtd && arg.xml[arg.index] === "[") {
        node.children = [];
    }
    if (!node.name) {
        // TODO:适配allowNodeNameNotClose
        throwError(
            TAG_NAME_IS_EMPTY,
            arg,
            node.locationInfo.startLine,
            node.locationInfo.startCol
        );
    }
    if (node.selfcloseing) {
        delete arg.currentNode;
        if (node.parent) {
            arg.currentNode = node.parent;
        }
        return;
    }
    if (node.type === LxNodeType.dtd && node.children) {
        return;
    }
    if (
        (node.type === LxNodeType.processingInstruction ||
            node.type === LxNodeType.dtd ||
            (node.parent && node.parent.type === LxNodeType.dtd)) &&
        node.locationInfo.startTag.endCol
    ) {
        delete node.notClose;
        delete arg.currentNode;
        if (node.parent) {
            arg.currentNode = node.parent;
        }
        return;
    }
};

/**
 * 拿node类型对应的结束字符集匹配当前字符集，判断出是否遇到了attrs终止的情况
 * @param {LxParseArg} arg
 * @returns {number} 结束字符集长度
 */
export const checkAttrsEnd = (arg: LxParseArg): number => {
    const { currentNode, xml, index } = arg;
    const char = xml[index];
    if (
        currentNode.type === LxNodeType.processingInstruction &&
        equalSubStr(xml, index, PI_END)
    ) {
        return 2;
    }
    if (currentNode.type === LxNodeType.dtd && (char === "[" || char === ">")) {
        return 1;
    }
    if (char === ">") {
        return 1;
    }
    if (char === "/" && xml[index + 1] === ">") {
        return 2;
    }
};

export const parseAttrs = (arg: LxParseArg) => {
    const { xml, xmlLength, currentNode } = arg;
    let currentAttr: LxNode;
    let value;
    let findTarget: LxParseAttrTarget; // 表示正在寻找某目标，而不是当前已经是某目标
    let leftBoundaryValue = "";
    const beginIndex = arg.index;
    const plusNormalChar = (char?: string) => {
        if (!findTarget) {
            findTarget = LxParseAttrTarget.name;
            currentAttr = initNode(LxNodeType.attr, arg);
            pushNode(currentAttr, arg);
        }
        if (char) {
            if (!value) {
                value = "";
            }
            value += char;
            endLocation();
        }
    };
    const endLocation = () => {
        currentAttr.locationInfo.endOffset = arg.index;
        currentAttr.locationInfo.endLine = arg.line;
        currentAttr.locationInfo.endCol = arg.col;
    };
    const validateAttrQuealNearSpace = () => {
        const nearHasSpace =
            (arg.index - 1 > beginIndex &&
                REX_SPACE.test(xml[arg.index - 1])) ||
            REX_SPACE.test(xml[arg.index + 1]);
        if (nearHasSpace && !isTrueOption(arg, "allowNearAttrEqualSpace")) {
            throwError(ATTR_EQUAL_NEAR_SPACE, arg);
        }
    };
    for (; arg.index < xmlLength; plusArgNumber(arg, 1, 0, 1)) {
        const hookResult = execLoopHook(arg);
        if (hookResult === 1) {
            continue;
        }
        if (hookResult === 2) {
            break;
        }
        const char = xml[arg.index];
        if (checkLineBreak(arg, false)) {
            if (findTarget === LxParseAttrTarget.name && value) {
                currentAttr.name = value;
                fireEvent(LxEventType.nodeNameEnd, arg, currentAttr);
                value = undefined;
                findTarget = LxParseAttrTarget.equal;
                plusArgNumber(arg, 0, 1, -arg.col);
                continue;
            }
            if (findTarget === LxParseAttrTarget.content) {
                if (!isTrueOption(arg, "allowAttrContentHasBr")) {
                    throwError(ATTR_CONTENT_HAS_BR, arg);
                }
                plusNormalChar(char);
            }
            plusArgNumber(arg, 0, 1, -arg.col);
            continue;
        }
        if (REX_SPACE.test(char)) {
            if (findTarget === LxParseAttrTarget.name) {
                if (!value) {
                    continue;
                }
                currentAttr.name = value;
                fireEvent(LxEventType.nodeNameEnd, arg, currentAttr);
                value = undefined;
                findTarget = LxParseAttrTarget.equal;
                continue;
            }
            if (findTarget === LxParseAttrTarget.content) {
                if (leftBoundaryValue) {
                    value += char;
                    continue;
                }
                if (value) {
                    currentAttr.content = value;
                }
                fireEvent(LxEventType.nodeContentEnd, arg, currentAttr);
                fireEvent(LxEventType.nodeEnd, arg, currentAttr);
                leftBoundaryValue = currentAttr = findTarget = value = undefined;
                continue;
            }
            continue;
        }
        if (char === "=") {
            if (!findTarget) {
                plusNormalChar();
                if (!isTrueOption(arg, "allowAttrNameEmpty")) {
                    throwError(ATTR_NAME_IS_EMPTY, arg);
                }
                endLocation();
                fireEvent(LxEventType.attrEqual, arg, currentAttr);
                value = undefined;
                findTarget = LxParseAttrTarget.leftBoundary;
                currentAttr.equalCount++;
                validateAttrQuealNearSpace();
                continue;
            }
            if (findTarget === LxParseAttrTarget.name) {
                if (!value && !isTrueOption(arg, "allowAttrNameEmpty")) {
                    throwError(ATTR_NAME_IS_EMPTY, arg);
                }
                if (value) {
                    currentAttr.name = value;
                }
                fireEvent(LxEventType.nodeNameEnd, arg, currentAttr);
                endLocation();
                value = undefined;
                findTarget = LxParseAttrTarget.leftBoundary;
                currentAttr.equalCount++;
                fireEvent(LxEventType.attrEqual, arg, currentAttr);
                validateAttrQuealNearSpace();
                continue;
            }
            if (findTarget === LxParseAttrTarget.equal) {
                endLocation();
                findTarget = LxParseAttrTarget.leftBoundary;
                currentAttr.equalCount++;
                fireEvent(LxEventType.attrEqual, arg, currentAttr);
                validateAttrQuealNearSpace();
                continue;
            }
            if (findTarget === LxParseAttrTarget.leftBoundary) {
                if (
                    equalOption(
                        arg,
                        "encounterAttrMoreEqual",
                        AttrMoreEqualDisposal.throwError,
                        AttrMoreEqualDisposal.throwError
                    )
                ) {
                    currentAttr.equalCount++;
                    throwError(ATTR_HAS_MORE_EQUAL, arg);
                } else if (
                    equalOption(
                        arg,
                        "encounterAttrMoreEqual",
                        AttrMoreEqualDisposal.newAttr,
                        AttrMoreEqualDisposal.throwError
                    )
                ) {
                    fireEvent(LxEventType.nodeEnd, arg, currentAttr);
                    leftBoundaryValue = currentAttr = findTarget = value = undefined;
                    plusNormalChar();
                    fireEvent(LxEventType.attrEqual, arg, currentAttr);
                    currentAttr.equalCount++;
                    if (!isTrueOption(arg, "allowAttrNameEmpty")) {
                        throwError(ATTR_NAME_IS_EMPTY, arg);
                    }
                    endLocation();
                    validateAttrQuealNearSpace();
                    value = undefined;
                    findTarget = LxParseAttrTarget.leftBoundary;
                    continue;
                }
                fireEvent(LxEventType.attrEqual, arg, currentAttr);
                currentAttr.equalCount++;
                endLocation();
                continue;
            }
            if (
                findTarget === LxParseAttrTarget.content &&
                !leftBoundaryValue
            ) {
                if (value) {
                    currentAttr.content = value;
                }
                fireEvent(LxEventType.nodeContentEnd, arg, currentAttr);
                fireEvent(LxEventType.nodeEnd, arg, currentAttr);
                leftBoundaryValue = currentAttr = findTarget = value = undefined;
                plusNormalChar();
                fireEvent(LxEventType.attrEqual, arg, currentAttr);
                currentAttr.equalCount++;
                if (!isTrueOption(arg, "allowAttrNameEmpty")) {
                    throwError(ATTR_NAME_IS_EMPTY, arg);
                }
                endLocation();
                value = undefined;
                findTarget = LxParseAttrTarget.leftBoundary;
                continue;
            }
        }
        if (char === "'" || char === '"') {
            if (!findTarget || findTarget === LxParseAttrTarget.name) {
                throwError(ATTR_NAME_IS_WRONG, arg);
            }
            if (findTarget === LxParseAttrTarget.equal) {
                throwError(ATTR_IS_WRONG, arg);
            }
            if (findTarget === LxParseAttrTarget.leftBoundary) {
                currentAttr.boundaryChar = char;
                fireEvent(LxEventType.attrLeftBoundary, arg, currentAttr);
                fireEvent(LxEventType.nodeContentStart, arg, currentAttr);
                findTarget = LxParseAttrTarget.content;
                value = undefined;
                leftBoundaryValue = char;
                continue;
            }
            if (findTarget === LxParseAttrTarget.content) {
                if (leftBoundaryValue === char) {
                    fireEvent(LxEventType.attrRightBoundary, arg, currentAttr);
                    currentAttr.content = value;
                    endLocation();
                    fireEvent(LxEventType.nodeContentEnd, arg, currentAttr);
                    fireEvent(LxEventType.nodeEnd, arg, currentAttr);
                    leftBoundaryValue = currentAttr = findTarget = value = undefined;
                    continue;
                }
            }
        }
        let attrsEndPlus = 0;
        if ((attrsEndPlus = checkAttrsEnd(arg))) {
            let selfcloseing =
                currentNode.type === LxNodeType.element && attrsEndPlus === 2;
            if (
                !findTarget ||
                findTarget === LxParseAttrTarget.name ||
                findTarget === LxParseAttrTarget.equal ||
                findTarget === LxParseAttrTarget.leftBoundary ||
                (findTarget === LxParseAttrTarget.content &&
                    currentAttr &&
                    !currentAttr.boundaryChar)
            ) {
                if (selfcloseing) {
                    currentNode.selfcloseing = true;
                }
                if (currentNode.type === LxNodeType.dtd && char === "[") {
                    currentNode.children = [];
                }
                if (currentAttr) {
                    if (findTarget === LxParseAttrTarget.name) {
                        if (value) {
                            currentAttr.name = value;
                        }
                        fireEvent(LxEventType.nodeNameEnd, arg, currentAttr);
                    }
                    if (findTarget === LxParseAttrTarget.content) {
                        if (value) {
                            currentAttr.content = value;
                        }
                        fireEvent(LxEventType.nodeContentEnd, arg, currentAttr);
                        fireEvent(LxEventType.nodeEnd, arg, currentAttr);
                    }
                }
                currentAttr = findTarget = value = undefined;
                execStartTagEnd(arg);
                break;
            }
        }
        if (findTarget === LxParseAttrTarget.leftBoundary) {
            findTarget = LxParseAttrTarget.content;
            value = undefined;
            leftBoundaryValue = undefined;
            fireEvent(LxEventType.nodeContentStart, arg, currentAttr);
            plusNormalChar(char);
            continue;
        }
        if (findTarget === LxParseAttrTarget.equal) {
            fireEvent(LxEventType.nodeEnd, arg, currentAttr);
            leftBoundaryValue = currentAttr = findTarget = value = undefined;
            plusNormalChar(char);
            fireEvent(LxEventType.nodeNameStart, arg, currentAttr);
            continue;
        }
        plusNormalChar(char);
    }
};

export const parseEndTag = (startIndex: number, arg: LxParseArg) => {
    const { xml, xmlLength } = arg;
    const endTag: LxLocation = {
        startLine: arg.line,
        startCol: arg.col,
        startOffset: startIndex,
    };
    fireEvent(LxEventType.endTagStart, arg, arg.currentNode);
    plusArgNumber(arg, 1, 0, 1);
    let value = "";
    for (; arg.index < xmlLength; plusArgNumber(arg, 1, 0, 1)) {
        const hookResult = execLoopHook(arg);
        if (hookResult === 1) {
            continue;
        }
        if (hookResult === 2) {
            break;
        }
        const char = xml[arg.index];
        if (char === "<") {
            throwError(TAG_HAS_MORE_BOUNDARY_CHAR, arg);
        }
        if (char === ">") {
            closeElement(arg, value, endTag);
            break;
        }
        if (char !== "/") {
            value += char;
        }
    }
};

const equalTagNameParentIndex = (
    arg: LxParseArg,
    currentNode: LxNode,
    tagName
) => {
    let index = -1;
    let parent = currentNode;
    while ((parent = parent.parent)) {
        index++;
        if (equalTagName(arg, parent, tagName)) {
            break;
        }
    }
    return index;
};

export const closeNode = (node: LxNode, arg: LxParseArg, tagName?: string) => {
    if (
        !node.notClose &&
        (node.type === LxNodeType.dtd ||
            node.type === LxNodeType.processingInstruction ||
            (node.parent && node.parent.type === LxNodeType.dtd))
    ) {
        node.locationInfo.endOffset = arg.index;
        node.locationInfo.endCol = arg.col;
        node.locationInfo.endLine = arg.line;
        fireEvent(LxEventType.endTagEnd, arg, node);
        fireEvent(LxEventType.nodeEnd, arg, node);
        return;
    }
    if (!allowNodeNotClose(arg, node)) {
        const endTag = tagName ? `</${tagName}>` : "";
        const startTag =
            node.type === LxNodeType.element
                ? `<${node.name}>`
                : node.type === LxNodeType.comment
                ? "<!--"
                : node.type === LxNodeType.processingInstruction
                ? `<?${node.name}`
                : "";
        throwError(
            TAG_NAME_NOT_EQUAL,
            arg,
            arg.line,
            arg.col,
            `start-tag=${startTag}, end-tag=${endTag}`
        );
    }
    if (!tagName) {
        node.notClose = true;
        node.locationInfo.endOffset = arg.index;
        node.locationInfo.endCol = arg.col;
        node.locationInfo.endLine = arg.line;
        fireEvent(LxEventType.nodeEnd, arg, node);
    }
};
export const closeElement = (
    arg: LxParseArg,
    tagName?: string,
    endTag?: LxLocation
) => {
    const currentNode = arg.currentNode;
    if (tagName && equalTagName(arg, currentNode, tagName)) {
        currentNode.locationInfo.endOffset = endTag.endOffset = arg.index;
        currentNode.locationInfo.endCol = endTag.endCol = arg.col;
        currentNode.locationInfo.endLine = endTag.endLine = arg.line;
        currentNode.locationInfo.endTag = endTag;
        fireEvent(LxEventType.endTagEnd, arg, arg.currentNode);
        fireEvent(LxEventType.nodeEnd, arg, arg.currentNode);
        if (currentNode.parent) {
            arg.currentNode = currentNode.parent;
        } else {
            delete arg.currentNode;
        }
        return;
    }
    closeNode(arg.currentNode, arg, tagName);
    if (tagName) {
        const parentIndex = equalTagNameParentIndex(
            arg,
            arg.currentNode,
            tagName
        );
        if (parentIndex !== -1) {
            const len = parentIndex + 1;
            let node = currentNode;
            for (let index = 0; index < len; index++) {
                const children = node.children || [];
                delete node.children;
                const textChildren = [];
                const otherChildren = [];
                let breakEach;
                children.forEach((item) => {
                    if (
                        breakEach ||
                        item.type === LxNodeType.element ||
                        item.type === LxNodeType.comment
                    ) {
                        breakEach = true;
                        otherChildren.push(item);
                        return;
                    }
                    textChildren.push(item);
                });
                if (textChildren.length) {
                    node.children = textChildren;
                    const lastTextLoc =
                        textChildren[textChildren.length - 1].locationInfo;
                    node.locationInfo.endOffset = lastTextLoc.endOffset;
                    node.locationInfo.endCol = lastTextLoc.endCol;
                    node.locationInfo.endLine = lastTextLoc.endLine;
                } else {
                    node.locationInfo.endOffset =
                        node.locationInfo.startTag.endOffset;
                    node.locationInfo.endCol =
                        node.locationInfo.startTag.endCol;
                    node.locationInfo.endLine =
                        node.locationInfo.startTag.endLine;
                }
                node.parent.children = node.parent.children.concat(
                    otherChildren
                );
                fireEvent(LxEventType.endTagEnd, arg, node);
                fireEvent(LxEventType.nodeEnd, arg, node);
                node.notClose = true;
                node = node.parent;
                arg.currentNode = node;
            }
            node.locationInfo.endOffset = endTag.endOffset = arg.index;
            node.locationInfo.endCol = endTag.endCol = arg.col;
            node.locationInfo.endLine = endTag.endLine = arg.line;
            node.locationInfo.endTag = endTag;
            fireEvent(LxEventType.endTagEnd, arg, node);
            fireEvent(LxEventType.nodeEnd, arg, node);
            if (node.parent) {
                arg.currentNode = node.parent;
            } else {
                delete arg.currentNode;
            }
        }
        return;
    }
    if (currentNode.parent) {
        arg.currentNode = currentNode.parent;
        closeElement(arg);
    }
};
