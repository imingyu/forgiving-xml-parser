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
    addWarn,
    throwError,
    fireEvent,
    checkLineBreak,
    isTrueOption,
    equalTagName,
    lxEach,
    equalOption,
} from "./util";

const RexSpace = /\s/g;
const parseStartTag = (startIndex: number, arg: LxParseArg) => {
    const { xml, xmlLength } = arg;
    let selfCloseing;
    let isComment = arg.xml.substr(startIndex, 4) === "<!--";
    let tagName = "";
    let startTagClosed;
    const startTag: LxLocation = {
        startLine: arg.line,
        startCol: arg.col,
        startOffset: arg.index,
    };
    let endTag: LxLocation;
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
        plusArgNumber(arg, 4, 0, 4);
        startTag.endLine = arg.line;
        startTag.endCol = arg.col;
        startTag.endOffset = arg.index;
    } else {
        plusArgNumber(arg, 1, 0, 1);
    }

    for (; arg.index < xmlLength; plusArgNumber(arg, 1, 0, 1)) {
        const char = xml[arg.index];
        if (isComment) {
            if (char === "-" && arg.xml.substr(arg.index, 3) === "-->") {
                node.content = tagName;
                endTag = {
                    startLine: arg.line,
                    startCol: arg.col,
                    startOffset: arg.index,
                };
                plusArgNumber(arg, 2, 0, 2);
                endTag.endLine = arg.line;
                endTag.endCol = arg.col;
                endTag.endOffset = arg.index;
                break;
            }
            tagName += char;
            checkLineBreak(arg);
            if (arg.index === xmlLength - 1) {
                throwError(TAG_NOT_CLOSE, arg);
            }
        } else {
            if (RexSpace.test(char)) {
                if (arg.index > startIndex && tagName) {
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
            if (char === ">") {
                startTag.endLine = arg.line;
                startTag.endCol = arg.col;
                startTag.endOffset = arg.index;
                startTagClosed = true;
                plusArgNumber(arg, 1, 0, 1);
                break;
            }
            if (char === "/" && xml[arg.index + 1] === ">") {
                selfCloseing = true;
                plusArgNumber(arg, 1, 0, 1);
                startTag.endLine = arg.line;
                startTag.endCol = arg.col;
                startTag.endOffset = arg.index;
                plusArgNumber(arg, 1, 0, 1);
                break;
            }
            if (arg.index === xmlLength - 1) {
                throwError(TAG_NOT_CLOSE, arg);
            }
            tagName += char;
        }
    }
    if (!isComment && !tagName) {
        throwError(
            TAG_NAME_IS_EMPTY,
            arg,
            startTag.startLine,
            startTag.startCol
        );
    }

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
    if (!startTagClosed) {
        const attrs = parseAttrs(arg, node);
        if (attrs.length) {
            node.attrs = attrs;
            node.locationInfo.attrs = {};
            attrs.forEach((attr) => {
                attr.parent = node;
                node.locationInfo.attrs[attr.name] = attr.locationInfo;
            });
        }
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
    plusArgNumber(arg, 1, 0, 1);
    let value = "";
    for (; arg.index < xmlLength; plusArgNumber(arg, 1, 0, 1)) {
        const char = xml[arg.index];
        if (char === "<") {
            throwError(TAG_HAS_MORE_BOUNDARY_CHAR, arg);
        }
        if (char === ">") {
            if (!equalTagName(arg, arg.currentNode, value)) {
                if (isTrueOption(arg, "allowTagNotClose")) {
                    if (equalTagName(arg, arg.currentNode.parent, value)) {
                    }
                } else {
                    throwError(
                        TAG_NAME_NOT_EQUAL,
                        arg,
                        arg.line,
                        arg.col,
                        `start-tag=<${arg.currentNode.name}>, end-tag=</${value}>`
                    );
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
            plusArgNumber(arg, 0, 0, 1);
            break;
        }
        if (char !== "/") {
            value += char;
        }
    }
};

const parseAttrs = (arg: LxParseArg, element: LxNode): LxNode[] => {
    const { xml, xmlLength } = arg;
    const attrs = [] as LxNode[];
    let currentAttr: LxNode;
    let value;
    let findTarget: LxParseAttrTarget; // 表示正在寻找某目标，而不是当前已经是某目标
    let leftBoundaryValue = "";
    const plusNormalChar = (char?: string) => {
        if (!findTarget) {
            findTarget = LxParseAttrTarget.name;
            currentAttr = {
                type: LxNodeType.attr,
                equalCount: 0,
                locationInfo: {
                    startLine: arg.line,
                    startCol: arg.col,
                    startOffset: arg.index,
                },
            } as LxNode;
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
            RexSpace.test(xml[arg.index - 1]) ||
            RexSpace.test(xml[arg.index + 1]);
        if (nearHasSpace && !isTrueOption(arg, "allowNearAttrEqualSpace")) {
            throwError(ATTR_EQUAL_NEAR_SPACE, arg);
        }
    };
    for (; arg.index < xmlLength; plusArgNumber(arg, 1, 0, 1)) {
        const char = xml[arg.index];
        if (checkLineBreak(arg, false)) {
            if (findTarget === LxParseAttrTarget.name && value) {
                currentAttr.name = value;
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
                endLocation();
                value = undefined;
                findTarget = LxParseAttrTarget.leftBoundary;
                currentAttr.equalCount++;
                validateAttrQuealNearSpace();
                continue;
            }
            if (findTarget === LxParseAttrTarget.equal) {
                endLocation();
                findTarget = LxParseAttrTarget.leftBoundary;
                currentAttr.equalCount++;
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
                    attrs.push(currentAttr);
                    leftBoundaryValue = currentAttr = findTarget = value = undefined;
                    plusNormalChar();
                    currentAttr.equalCount++;
                    if (!isTrueOption(arg, "allowAttrNameEmpty")) {
                        throwError(ATTR_NAME_IS_EMPTY, arg);
                    }
                    endLocation();
                    value = undefined;
                    findTarget = LxParseAttrTarget.leftBoundary;
                    continue;
                }
                currentAttr.equalCount++;
                endLocation();
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
                findTarget = LxParseAttrTarget.content;
                value = undefined;
                leftBoundaryValue = char;
                continue;
            }
            if (findTarget === LxParseAttrTarget.content) {
                if (leftBoundaryValue === char) {
                    currentAttr.content = value;
                    endLocation();
                    attrs.push(currentAttr);
                    leftBoundaryValue = currentAttr = findTarget = value = undefined;
                    continue;
                }
            }
        }
        const selfClose = char === "/" && xml[arg.index + 1] === ">";
        if (char === ">" || selfClose) {
            if (
                !findTarget ||
                findTarget === LxParseAttrTarget.name ||
                findTarget === LxParseAttrTarget.equal ||
                findTarget === LxParseAttrTarget.leftBoundary ||
                (findTarget === LxParseAttrTarget.content &&
                    currentAttr &&
                    !currentAttr.boundaryChar)
            ) {
                if (selfClose) {
                    plusArgNumber(arg, 1, 0, 1);
                    element.selfcloseing = true;
                    element.locationInfo.endOffset = arg.index;
                    element.locationInfo.endLine = arg.line;
                    element.locationInfo.endCol = arg.col;
                }
                element.locationInfo.startTag.endOffset = arg.index;
                element.locationInfo.startTag.endLine = arg.line;
                element.locationInfo.startTag.endCol = arg.col;
                if (currentAttr) {
                    if (findTarget === LxParseAttrTarget.name && value) {
                        currentAttr.name = value;
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
            plusNormalChar(char);
            continue;
        }
        if (findTarget === LxParseAttrTarget.equal) {
            attrs.push(currentAttr);
            leftBoundaryValue = currentAttr = findTarget = value = undefined;
            plusNormalChar(char);
            continue;
        }
        plusNormalChar(char);
    }
    return attrs;
};

const loopParse = (arg: LxParseArg): LxParseArg => {
    const { xml, xmlLength } = arg;
    for (; arg.index < xmlLength; plusArgNumber(arg, 1, 0, 1)) {
        if (!arg.maxLine) {
            arg.maxLine = 1;
        }
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
            checkLineBreak(arg);
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
            checkLineBreak(arg);
            continue;
        }
        plusArgNumber(arg, 0, 0, 1);
        arg.currentNode.content += char;
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
