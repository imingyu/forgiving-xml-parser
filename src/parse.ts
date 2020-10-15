import {
    LxNode,
    LxParseArg,
    LxNodeType,
    LxLocation,
    LxParseOptions,
    LxParseResult,
    LxParseResultJSON,
    LxToJSONOptions,
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
    TAG_NAME_NOT_EQUAL,
    ATTR_EQUAL_NEAR_SPACE,
} from "./message";
import {
    pick,
    nodeToJSON,
    plusArgNumber,
    lxWrongToJSON,
    pushElement,
    throwError,
    fireEvent,
    checkLineBreak,
    isTrueOption,
    equalTagName,
    equalOption,
    allowNodeNotClose,
    execEndTag,
    checkNodeContentEnd,
    initNode,
} from "./util";
import {
    CDATA_END,
    CDATA_START,
    COMMENT_END,
    COMMENT_START,
    PI_END,
} from "./var";

export const RexSpace = /\s/;

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

export const parseStartTag = (startIndex: number, arg: LxParseArg) => {
    const { xml, xmlLength } = arg;
    let selfCloseing;
    let isPI = xml[arg.index + 1] === "?";
    let tagName = "";
    let startTagClosed;
    const node = initNode(
        isPI ? LxNodeType.processingInstruction : LxNodeType.element,
        arg
    );
    for (; arg.index < xmlLength; plusArgNumber(arg, 1, 0, 1)) {
        const hookResult = execLoopHook(arg);
        if (hookResult === 1) {
            continue;
        }
        if (hookResult === 2) {
            break;
        }
        const char = xml[arg.index];
        if (RexSpace.test(char)) {
            if (arg.index > startIndex && tagName) {
                node.name = tagName;
                fireEvent(LxEventType.nodeNameEnd, arg, node);
                if (isPI) {
                    node.locationInfo.startTag.endLine = arg.line;
                    node.locationInfo.startTag.endCol = arg.col;
                    node.locationInfo.startTag.endOffset = arg.index;
                    startTagClosed = true;
                    fireEvent(LxEventType.startTagEnd, arg, node);
                }
                plusArgNumber(arg, 1, 0, 1);
                break;
            }
            if (!isTrueOption(arg, "allowNearTagNameSpace")) {
                throwError(TAG_BOUNDARY_CHAR_HAS_SPACE, arg);
            }
            checkLineBreak(arg);
            if (arg.index === xmlLength - 1) {
                throwError(TAG_NAME_IS_EMPTY, arg);
            }
            continue;
        }
        if (char === "<") {
            throwError(TAG_HAS_MORE_BOUNDARY_CHAR, arg);
        }
        if (
            char === PI_END[0] &&
            isPI &&
            xml.substr(arg.index, PI_END.length) === PI_END
        ) {
            execEndTag(arg, node);
            break;
        }
        if (char === ">") {
            if (tagName) {
                node.name = tagName;
            }
            node.locationInfo.startTag.endLine = arg.line;
            node.locationInfo.startTag.endCol = arg.col;
            node.locationInfo.startTag.endOffset = arg.index;
            startTagClosed = true;
            fireEvent(LxEventType.nodeNameEnd, arg, node);
            fireEvent(LxEventType.startTagEnd, arg, node);
            break;
        }
        if (char === "/" && xml[arg.index + 1] === ">") {
            if (tagName) {
                node.name = tagName;
            }
            fireEvent(LxEventType.nodeNameEnd, arg, node);
            selfCloseing = true;
            plusArgNumber(arg, 1, 0, 1);
            node.locationInfo.startTag.endLine = arg.line;
            node.locationInfo.startTag.endCol = arg.col;
            node.locationInfo.startTag.endOffset = arg.index;
            fireEvent(LxEventType.startTagEnd, arg, node);
            fireEvent(LxEventType.nodeEnd, arg, node);
            break;
        }
        if (arg.index === xmlLength - 1) {
            // TODO:适配allowNodeNotClose
            throwError(TAG_NOT_CLOSE, arg);
        }
        tagName += char;
    }
    if (!tagName) {
        // TODO:适配allowNodeNameNotClose
        throwError(
            TAG_NAME_IS_EMPTY,
            arg,
            node.locationInfo.startLine,
            node.locationInfo.startCol
        );
    }
    if (selfCloseing) {
        node.selfcloseing = true;
        node.locationInfo.endLine = node.locationInfo.startTag.endLine;
        node.locationInfo.endCol = node.locationInfo.startTag.endCol;
        node.locationInfo.endOffset = node.locationInfo.startTag.endOffset;
        return pushElement(node, arg);
    }
    if (!startTagClosed || isPI) {
        fireEvent(LxEventType.attrsStart, arg, node);
        const attrs = parseAttrs(arg, node);
        if (attrs.length) {
            node.attrs = attrs;
            node.locationInfo.attrs = {};
            attrs.forEach((attr) => {
                node.locationInfo.attrs[attr.name] = attr.locationInfo;
            });
        }
    }
    return pushElement(node, arg);
};

export const parseAttrs = (arg: LxParseArg, element: LxNode): LxNode[] => {
    const { xml, xmlLength } = arg;
    const attrs = [] as LxNode[];
    let currentAttr: LxNode;
    let value;
    let findTarget: LxParseAttrTarget; // 表示正在寻找某目标，而不是当前已经是某目标
    let leftBoundaryValue = "";
    const beginIndex = arg.index;
    const plusNormalChar = (char?: string) => {
        if (!findTarget) {
            findTarget = LxParseAttrTarget.name;
            currentAttr = initNode(LxNodeType.attr, arg);
            currentAttr.parent = element;
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
            (arg.index - 1 > beginIndex && RexSpace.test(xml[arg.index - 1])) ||
            RexSpace.test(xml[arg.index + 1]);
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
        if (RexSpace.test(char)) {
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
                attrs.push(currentAttr);
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
                    attrs.push(currentAttr);
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
                attrs.push(currentAttr);
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
                    attrs.push(currentAttr);
                    leftBoundaryValue = currentAttr = findTarget = value = undefined;
                    continue;
                }
            }
        }
        const selfClose = char === "/" && xml[arg.index + 1] === ">";
        const piClose =
            char === PI_END[0] &&
            element.type === LxNodeType.processingInstruction &&
            xml.substr(arg.index, PI_END.length) === PI_END;
        if (char === ">" || selfClose || piClose) {
            if (
                !findTarget ||
                findTarget === LxParseAttrTarget.name ||
                findTarget === LxParseAttrTarget.equal ||
                findTarget === LxParseAttrTarget.leftBoundary ||
                (findTarget === LxParseAttrTarget.content &&
                    currentAttr &&
                    !currentAttr.boundaryChar)
            ) {
                !piClose && fireEvent(LxEventType.startTagEnd, arg, element);
                if (piClose) {
                    execEndTag(arg, element);
                }
                if (selfClose) {
                    plusArgNumber(arg, 1, 0, 1);
                    fireEvent(LxEventType.nodeEnd, arg, element);
                    element.selfcloseing = true;
                    element.locationInfo.endOffset = arg.index;
                    element.locationInfo.endLine = arg.line;
                    element.locationInfo.endCol = arg.col;
                }
                if (!piClose || selfClose) {
                    element.locationInfo.startTag.endOffset = arg.index;
                    element.locationInfo.startTag.endLine = arg.line;
                    element.locationInfo.startTag.endCol = arg.col;
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
                    attrs.push(currentAttr);
                }
                currentAttr = findTarget = value = undefined;
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
            attrs.push(currentAttr);
            leftBoundaryValue = currentAttr = findTarget = value = undefined;
            plusNormalChar(char);
            fireEvent(LxEventType.nodeNameStart, arg, currentAttr);
            continue;
        }
        plusNormalChar(char);
    }
    return attrs;
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

export const parseCDATA = (arg: LxParseArg) => {
    const { xml, xmlLength } = arg;
    const node = initNode(LxNodeType.cdata, arg);
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
            char === CDATA_END[0] &&
            xml.substr(arg.index, CDATA_END.length) === CDATA_END
        ) {
            execEndTag(arg, node);
            break;
        }
        node.content += char;
        checkLineBreak(arg);
        checkNodeContentEnd(arg);
    }
    if (arg.currentNode) {
        if (arg.currentNode.type === LxNodeType.element) {
            if (!arg.currentNode.children) {
                arg.currentNode.children = [];
            }
            arg.currentNode.children.push(node);
            return;
        }
        arg.nodes.push(arg.currentNode);
        delete arg.currentNode;
    }
    arg.nodes.push(node);
};

export const parseComment = (arg: LxParseArg) => {
    const { xml, xmlLength } = arg;
    const node = initNode(LxNodeType.comment, arg);
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
            char === COMMENT_END[0] &&
            xml.substr(arg.index, COMMENT_END.length) === COMMENT_END
        ) {
            execEndTag(arg, node);
            break;
        }
        node.content += char;
        checkLineBreak(arg);
        checkNodeContentEnd(arg);
    }
    return pushElement(node, arg);
};

const execLoopHook = (arg: LxParseArg): number => {
    if (arg.options && typeof arg.options.loopHook === "function") {
        return arg.options.loopHook(arg);
    }
};

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
        const char = xml[arg.index];
        if (char === "<") {
            if (xml.substr(arg.index, CDATA_START.length) === CDATA_START) {
                parseCDATA(arg);
                continue;
            }
            if (xml.substr(arg.index, COMMENT_START.length) === COMMENT_START) {
                parseComment(arg);
                continue;
            }
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
            checkLineBreak(arg);
            continue;
        }
        if (arg.currentNode.type === LxNodeType.element) {
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
