// import {
//     LxNode,
//     LxParseContext,
//     LxNodeType,
//     LxLocation,
//     LxParseAttrTarget,
//     LxEventType,
//     AttrMoreEqualDisposal,
//     LxElementEndTagInfo,
//     LxWrong,
//     TagMoreLeftBoundaryCharDisposal,
// } from "./types";
// import {
//     TAG_HAS_MORE_BOUNDARY_CHAR,
//     TAG_NAME_IS_EMPTY,
//     ATTR_CONTENT_HAS_BR,
//     ATTR_NAME_IS_EMPTY,
//     ATTR_HAS_MORE_EQUAL,
//     ATTR_NAME_IS_WRONG,
//     ATTR_IS_WRONG,
//     ATTR_EQUAL_NEAR_SPACE,
//     TAG_NAME_NOT_EQUAL,
//     TAG_NOT_CLOSE,
// } from "./message";
// import {
//     plusArgNumber,
//     throwError,
//     getNodeType,
//     equalSubStr,
//     currentIsLineBreak,
//     setArgMaxNumber,
// } from "./util";
// import { PI_END, REX_SPACE } from "./var";
// import {
//     computeOption,
//     fireEvent,
//     equalOption,
//     isTrueOption,
//     allowNodeNotClose,
//     equalTagName,
// } from "./option";
// import {
//     initNode,
//     pushNode,
//     setEndLocation,
//     setStartLocation,
//     execStartTagEnd,
// } from "./init";
// import {
//     checkAttrsEnd,
//     checkLineBreak,
//     checkDtdEnd,
//     checkPIEnd,
// } from "./check";

// /**
//  * 解析并设置当前元素（type=element|pi|dtd）的标签名称，并在正确的条件下触发事件、设置位置信息、关闭当前node、但不会重新设定当前node
//  * @param {LxParseContext} context
//  * @returns {boolean} 是否需要继续解析attrs
//  */
// export const parseStartTagName = (context: LxParseContext) => {
//     const { currentNode, xmlLength, xml } = context;
//     let needParseAttrs = true;
//     let tagName = "";
//     for (; context.index < xmlLength; plusArgNumber(context, 1, 0, 1)) {
//         const char = xml[context.index];
//         if (char === "<") {
//             const disposal = computeOption(
//                 context,
//                 "encounterTagMoreLeftBoundaryChar",
//                 TagMoreLeftBoundaryCharDisposal.throwError,
//                 currentNode,
//                 context
//             );
//             if (disposal === TagMoreLeftBoundaryCharDisposal.throwError) {
//                 throwError(TAG_HAS_MORE_BOUNDARY_CHAR, context);
//             } else if (
//                 disposal === TagMoreLeftBoundaryCharDisposal.accumulationToName
//             ) {
//                 tagName += char;
//             } else if (disposal === TagMoreLeftBoundaryCharDisposal.newNode) {
//                 if (tagName) {
//                     currentNode.name = tagName;
//                 }
//                 currentNode.notClose = true;
//                 fireEvent(LxEventType.nodeNameEnd, context, currentNode);
//                 setEndLocation(context, "startTag");
//                 fireEvent(LxEventType.startTagEnd, context, currentNode);
//                 closeNode(currentNode, context, tagName);
//                 needParseAttrs = false;
//                 break;
//             }
//         }
//         let attrsEndPlus = 0;
//         if ((attrsEndPlus = checkAttrsEnd(context))) {
//             if (tagName) {
//                 currentNode.name = tagName;
//             }
//             needParseAttrs = false;
//             fireEvent(LxEventType.nodeNameEnd, context, currentNode);
//             if (currentNode.type === LxNodeType.element && attrsEndPlus === 2) {
//                 currentNode.selfcloseing = true;
//                 plusArgNumber(context, 1, 0, 1);
//                 setEndLocation(context, "startTag");
//                 fireEvent(LxEventType.startTagEnd, context, currentNode);
//                 fireEvent(LxEventType.nodeEnd, context, currentNode);
//             }
//             break;
//         }
//         tagName += char;
//         checkLineBreak(context);
//         if (
//             tagName.trim() &&
//             xml[context.index + 1] &&
//             REX_SPACE.test(xml[context.index + 1])
//         ) {
//             currentNode.name = tagName;
//             fireEvent(LxEventType.nodeNameEnd, context, currentNode);
//             plusArgNumber(context, 1, 0, 1);
//             break;
//         }
//         if (context.index === xmlLength - 1) {
//             currentNode.notClose = true;
//             needParseAttrs = false;
//             if (tagName) {
//                 currentNode.name = tagName;
//             }
//             fireEvent(LxEventType.nodeNameEnd, context, currentNode);
//             setEndLocation(context, "startTag");
//             fireEvent(LxEventType.startTagEnd, context, currentNode);
//         }
//     }
//     return needParseAttrs;
// };

// export const parseStartTag = (
//     context: LxParseContext,
//     nodeType?: LxNodeType
// ) => {
//     nodeType = nodeType || getNodeType(context);
//     const node = initNode(nodeType, context);
//     pushNode(node, context);
//     if (parseStartTagName(context)) {
//         fireEvent(LxEventType.attrsStart, context, node);
//         parseAttrs(context);
//     }
//     if (node.type === LxNodeType.dtd && context.xml[context.index] === "[") {
//         node.children = [];
//     }
//     if (!node.name) {
//         // TODO:适配allowNodeNameNotClose
//         throwError(
//             TAG_NAME_IS_EMPTY,
//             context,
//             node.locationInfo.startLine,
//             node.locationInfo.startCol
//         );
//     }
//     if (node.selfcloseing) {
//         delete context.currentNode;
//         if (node.parent) {
//             context.currentNode = node.parent;
//         }
//         return;
//     }
//     if (node.type === LxNodeType.dtd && node.children) {
//         return;
//     }
//     if (
//         (node.type === LxNodeType.processingInstruction ||
//             node.type === LxNodeType.dtd ||
//             (node.parent && node.parent.type === LxNodeType.dtd)) &&
//         node.locationInfo.startTag.endCol
//     ) {
//         delete node.notClose;
//         delete context.currentNode;
//         if (node.parent) {
//             context.currentNode = node.parent;
//         }
//         return;
//     }
// };

// export const parseAttrs = (context: LxParseContext) => {
//     const { xml, xmlLength, currentNode } = context;
//     let currentAttr: LxNode;
//     let value;
//     let findTarget: LxParseAttrTarget; // 表示正在寻找某目标，而不是当前已经是某目标
//     let leftBoundaryValue = "";
//     const beginIndex = context.index;
//     const plusNormalChar = (char?: string) => {
//         if (!findTarget) {
//             findTarget = LxParseAttrTarget.name;
//             currentAttr = initNode(LxNodeType.attr, context);
//             pushNode(currentAttr, context);
//         }
//         if (char) {
//             if (!value) {
//                 value = "";
//             }
//             value += char;
//             endLocation();
//         }
//     };
//     const endLocation = () => {
//         currentAttr.locationInfo.endOffset = context.index;
//         currentAttr.locationInfo.endLine = context.line;
//         currentAttr.locationInfo.endCol = context.col;
//     };
//     const validateAttrQuealNearSpace = () => {
//         const nearHasSpace =
//             (context.index - 1 > beginIndex &&
//                 REX_SPACE.test(xml[context.index - 1])) ||
//             REX_SPACE.test(xml[context.index + 1]);
//         if (nearHasSpace && !isTrueOption(context, "allowNearAttrEqualSpace")) {
//             throwError(ATTR_EQUAL_NEAR_SPACE, context);
//         }
//     };
//     for (; context.index < xmlLength; plusArgNumber(context, 1, 0, 1)) {
//         const char = xml[context.index];
//         if (checkLineBreak(context, false)) {
//             if (findTarget === LxParseAttrTarget.name && value) {
//                 currentAttr.name = value;
//                 fireEvent(LxEventType.nodeNameEnd, context, currentAttr);
//                 value = undefined;
//                 findTarget = LxParseAttrTarget.equal;
//                 plusArgNumber(context, 0, 1, -context.col);
//                 continue;
//             }
//             if (findTarget === LxParseAttrTarget.content) {
//                 if (!isTrueOption(context, "allowAttrContentHasBr")) {
//                     throwError(ATTR_CONTENT_HAS_BR, context);
//                 }
//                 plusNormalChar(char);
//             }
//             plusArgNumber(context, 0, 1, -context.col);
//             continue;
//         }
//         if (REX_SPACE.test(char)) {
//             if (findTarget === LxParseAttrTarget.name) {
//                 if (!value) {
//                     continue;
//                 }
//                 currentAttr.name = value;
//                 fireEvent(LxEventType.nodeNameEnd, context, currentAttr);
//                 value = undefined;
//                 findTarget = LxParseAttrTarget.equal;
//                 continue;
//             }
//             if (findTarget === LxParseAttrTarget.content) {
//                 if (leftBoundaryValue) {
//                     value += char;
//                     continue;
//                 }
//                 if (value) {
//                     currentAttr.content = value;
//                 }
//                 fireEvent(LxEventType.nodeContentEnd, context, currentAttr);
//                 fireEvent(LxEventType.nodeEnd, context, currentAttr);
//                 leftBoundaryValue = currentAttr = findTarget = value = undefined;
//                 continue;
//             }
//             continue;
//         }
//         if (char === "=") {
//             if (!findTarget) {
//                 plusNormalChar();
//                 if (!isTrueOption(context, "allowAttrNameEmpty")) {
//                     throwError(ATTR_NAME_IS_EMPTY, context);
//                 }
//                 endLocation();
//                 fireEvent(LxEventType.attrEqual, context, currentAttr);
//                 value = undefined;
//                 findTarget = LxParseAttrTarget.leftBoundary;
//                 currentAttr.equalCount++;
//                 validateAttrQuealNearSpace();
//                 continue;
//             }
//             if (findTarget === LxParseAttrTarget.name) {
//                 if (!value && !isTrueOption(context, "allowAttrNameEmpty")) {
//                     throwError(ATTR_NAME_IS_EMPTY, context);
//                 }
//                 if (value) {
//                     currentAttr.name = value;
//                 }
//                 fireEvent(LxEventType.nodeNameEnd, context, currentAttr);
//                 endLocation();
//                 value = undefined;
//                 findTarget = LxParseAttrTarget.leftBoundary;
//                 currentAttr.equalCount++;
//                 fireEvent(LxEventType.attrEqual, context, currentAttr);
//                 validateAttrQuealNearSpace();
//                 continue;
//             }
//             if (findTarget === LxParseAttrTarget.equal) {
//                 endLocation();
//                 findTarget = LxParseAttrTarget.leftBoundary;
//                 currentAttr.equalCount++;
//                 fireEvent(LxEventType.attrEqual, context, currentAttr);
//                 validateAttrQuealNearSpace();
//                 continue;
//             }
//             if (findTarget === LxParseAttrTarget.leftBoundary) {
//                 if (
//                     equalOption(
//                         context,
//                         "encounterAttrMoreEqual",
//                         AttrMoreEqualDisposal.throwError,
//                         AttrMoreEqualDisposal.throwError
//                     )
//                 ) {
//                     currentAttr.equalCount++;
//                     throwError(ATTR_HAS_MORE_EQUAL, context);
//                 } else if (
//                     equalOption(
//                         context,
//                         "encounterAttrMoreEqual",
//                         AttrMoreEqualDisposal.newAttr,
//                         AttrMoreEqualDisposal.throwError
//                     )
//                 ) {
//                     fireEvent(LxEventType.nodeEnd, context, currentAttr);
//                     leftBoundaryValue = currentAttr = findTarget = value = undefined;
//                     plusNormalChar();
//                     fireEvent(LxEventType.attrEqual, context, currentAttr);
//                     currentAttr.equalCount++;
//                     if (!isTrueOption(context, "allowAttrNameEmpty")) {
//                         throwError(ATTR_NAME_IS_EMPTY, context);
//                     }
//                     endLocation();
//                     validateAttrQuealNearSpace();
//                     value = undefined;
//                     findTarget = LxParseAttrTarget.leftBoundary;
//                     continue;
//                 }
//                 fireEvent(LxEventType.attrEqual, context, currentAttr);
//                 currentAttr.equalCount++;
//                 endLocation();
//                 continue;
//             }
//             if (
//                 findTarget === LxParseAttrTarget.content &&
//                 !leftBoundaryValue
//             ) {
//                 if (value) {
//                     currentAttr.content = value;
//                 }
//                 fireEvent(LxEventType.nodeContentEnd, context, currentAttr);
//                 fireEvent(LxEventType.nodeEnd, context, currentAttr);
//                 leftBoundaryValue = currentAttr = findTarget = value = undefined;
//                 plusNormalChar();
//                 fireEvent(LxEventType.attrEqual, context, currentAttr);
//                 currentAttr.equalCount++;
//                 if (!isTrueOption(context, "allowAttrNameEmpty")) {
//                     throwError(ATTR_NAME_IS_EMPTY, context);
//                 }
//                 endLocation();
//                 value = undefined;
//                 findTarget = LxParseAttrTarget.leftBoundary;
//                 continue;
//             }
//         }
//         if (char === "'" || char === '"') {
//             if (!findTarget || findTarget === LxParseAttrTarget.name) {
//                 throwError(ATTR_NAME_IS_WRONG, context);
//             }
//             if (findTarget === LxParseAttrTarget.equal) {
//                 throwError(ATTR_IS_WRONG, context);
//             }
//             if (findTarget === LxParseAttrTarget.leftBoundary) {
//                 currentAttr.boundaryChar = char;
//                 fireEvent(LxEventType.attrLeftBoundary, context, currentAttr);
//                 fireEvent(LxEventType.nodeContentStart, context, currentAttr);
//                 findTarget = LxParseAttrTarget.content;
//                 value = undefined;
//                 leftBoundaryValue = char;
//                 continue;
//             }
//             if (findTarget === LxParseAttrTarget.content) {
//                 if (leftBoundaryValue === char) {
//                     fireEvent(
//                         LxEventType.attrRightBoundary,
//                         context,
//                         currentAttr
//                     );
//                     currentAttr.content = value;
//                     endLocation();
//                     fireEvent(LxEventType.nodeContentEnd, context, currentAttr);
//                     fireEvent(LxEventType.nodeEnd, context, currentAttr);
//                     leftBoundaryValue = currentAttr = findTarget = value = undefined;
//                     continue;
//                 }
//             }
//         }
//         let attrsEndPlus = 0;
//         if ((attrsEndPlus = checkAttrsEnd(context))) {
//             let selfcloseing =
//                 currentNode.type === LxNodeType.element && attrsEndPlus === 2;
//             if (
//                 !findTarget ||
//                 findTarget === LxParseAttrTarget.name ||
//                 findTarget === LxParseAttrTarget.equal ||
//                 findTarget === LxParseAttrTarget.leftBoundary ||
//                 (findTarget === LxParseAttrTarget.content &&
//                     currentAttr &&
//                     !currentAttr.boundaryChar)
//             ) {
//                 if (selfcloseing) {
//                     currentNode.selfcloseing = true;
//                 }
//                 if (currentNode.type === LxNodeType.dtd && char === "[") {
//                     currentNode.children = [];
//                 }
//                 if (currentAttr) {
//                     if (findTarget === LxParseAttrTarget.name) {
//                         if (value) {
//                             currentAttr.name = value;
//                         }
//                         fireEvent(
//                             LxEventType.nodeNameEnd,
//                             context,
//                             currentAttr
//                         );
//                     }
//                     if (findTarget === LxParseAttrTarget.content) {
//                         if (value) {
//                             currentAttr.content = value;
//                         }
//                         fireEvent(
//                             LxEventType.nodeContentEnd,
//                             context,
//                             currentAttr
//                         );
//                         fireEvent(LxEventType.nodeEnd, context, currentAttr);
//                     }
//                 }
//                 currentAttr = findTarget = value = undefined;
//                 execStartTagEnd(context);
//                 break;
//             }
//         }
//         if (findTarget === LxParseAttrTarget.leftBoundary) {
//             findTarget = LxParseAttrTarget.content;
//             value = undefined;
//             leftBoundaryValue = undefined;
//             fireEvent(LxEventType.nodeContentStart, context, currentAttr);
//             plusNormalChar(char);
//             continue;
//         }
//         if (findTarget === LxParseAttrTarget.equal) {
//             fireEvent(LxEventType.nodeEnd, context, currentAttr);
//             leftBoundaryValue = currentAttr = findTarget = value = undefined;
//             plusNormalChar(char);
//             fireEvent(LxEventType.nodeNameStart, context, currentAttr);
//             continue;
//         }
//         plusNormalChar(char);
//     }
// };

// export const tryEndTag = (context: LxParseContext): LxElementEndTagInfo => {
//     let content = "";
//     const endTagLocation: LxLocation = {
//         startCol: context.col,
//         startLine: context.line,
//         startOffset: context.index,
//     };
//     let col = context.col + 2;
//     let line = context.line;
//     let index = context.index + 2;
//     let closed;
//     const wrongList: LxWrong[] = [];
//     const { xmlLength, xml } = context;
//     for (; index < xmlLength; index++) {
//         const char = xml[index];
//         if (char === ">") {
//             closed = true;
//             break;
//         }
//         if (char === "<") {
//             wrongList.push({
//                 ...TAG_HAS_MORE_BOUNDARY_CHAR,
//                 line,
//                 col,
//                 offset: index,
//             });
//         }
//         content += char;
//         if (currentIsLineBreak(context.xml, index)) {
//             line++;
//             col = 1;
//         } else {
//             col++;
//         }
//     }
//     endTagLocation.endCol = col;
//     endTagLocation.endLine = line;
//     endTagLocation.endOffset = index;
//     const res = {
//         closed,
//         content,
//         name: content.trim(),
//         locationInfo: endTagLocation,
//         boundaryHasSpace:
//             REX_SPACE.test(content[0]) ||
//             REX_SPACE.test(content[content.length - 1]),
//     } as LxElementEndTagInfo;
//     if (res.name === context.currentNode.name) {
//         if (res.name !== res.content) {
//             wrongList.push({
//                 ...TAG_NOT_CLOSE,
//                 line,
//                 col,
//                 offset: index,
//             });
//         }
//     } else {
//         const parentIndex = findParentIndexByTagName(
//             context,
//             context.currentNode,
//             res.name
//         );
//         res.parentIndex = parentIndex;
//         if (parentIndex === -1) {
//             if (!allowNodeNotClose(context, context.currentNode)) {
//                 const wrong = {
//                     ...TAG_NOT_CLOSE,
//                     line,
//                     col,
//                     offset: index,
//                 };
//                 wrongList.push(wrong);
//             }
//         }
//     }
//     if (wrongList.length) {
//         res.wrongList = wrongList;
//     }
//     return res;
// };

// /**
//  * 解析结束标签（cdata|comment类型的node结束标签不会在此方法中处理，会在parseAloneNode中处理）
//  * @param {LxParseContext} context
//  */
// export const parseEndTag = (context: LxParseContext) => {
//     const { xml, xmlLength } = context;
//     if (context.currentNode.type === LxNodeType.text) {
//         setEndLocation(context);
//         fireEvent(LxEventType.nodeContentEnd, context, context.currentNode);
//         fireEvent(LxEventType.nodeEnd, context, context.currentNode);
//         context.currentNode = context.currentNode.parent;
//         return parseEndTag(context);
//     }
//     if (checkDtdEnd(context)) {
//         if (context.currentNode.type !== LxNodeType.dtd) {
//             setEndLocation(context);
//             fireEvent(LxEventType.nodeEnd, context, context.currentNode);
//             context.currentNode = context.currentNode.parent;
//             return parseEndTag(context);
//         }
//         setStartLocation(context, "endTag");
//         fireEvent(LxEventType.endTagStart, context, context.currentNode);
//         plusArgNumber(context, 1, 0, 1);
//         fireEvent(LxEventType.endTagEnd, context, context.currentNode);
//         fireEvent(LxEventType.nodeEnd, context, context.currentNode);
//         return;
//     }
//     if (checkPIEnd(context)) {
//         setStartLocation(context, "endTag");
//         plusArgNumber(context, 1, 0, 1);
//         fireEvent(LxEventType.endTagEnd, context, context.currentNode);
//         fireEvent(LxEventType.nodeEnd, context, context.currentNode);
//         return;
//     }
//     const endTagInfo = tryEndTag(context);
//     if (endTagInfo.wrongList) {
//         endTagInfo.wrongList.forEach((wrong) => {
//             context.index = wrong.offset;
//             context.col = wrong.col;
//             context.line = wrong.line;
//             setArgMaxNumber(context);
//             throwError(wrong, context);
//         });
//     }
//     setStartLocation(context, "endTag");
//     fireEvent(LxEventType.endTagStart, context, context.currentNode);
//     plusArgNumber(context, 2, 0, 2);
// };

// const findParentIndexByTagName = (
//     context: LxParseContext,
//     currentNode: LxNode,
//     tagName
// ) => {
//     let index = -1;
//     let parent = currentNode;
//     while ((parent = parent.parent)) {
//         index++;
//         if (equalTagName(context, parent, tagName)) {
//             break;
//         }
//     }
//     return index;
// };

// export const closeNode = (
//     node: LxNode,
//     context: LxParseContext,
//     tagName?: string
// ) => {
//     if (
//         !node.notClose &&
//         (node.type === LxNodeType.dtd ||
//             node.type === LxNodeType.processingInstruction ||
//             (node.parent && node.parent.type === LxNodeType.dtd))
//     ) {
//         node.locationInfo.endOffset = context.index;
//         node.locationInfo.endCol = context.col;
//         node.locationInfo.endLine = context.line;
//         fireEvent(LxEventType.endTagEnd, context, node);
//         fireEvent(LxEventType.nodeEnd, context, node);
//         return;
//     }
//     if (!allowNodeNotClose(context, node)) {
//         const endTag = tagName ? `</${tagName}>` : "";
//         const startTag =
//             node.type === LxNodeType.element
//                 ? `<${node.name}>`
//                 : node.type === LxNodeType.comment
//                 ? "<!--"
//                 : node.type === LxNodeType.processingInstruction
//                 ? `<?${node.name}`
//                 : "";
//         throwError(
//             TAG_NAME_NOT_EQUAL,
//             context,
//             context.line,
//             context.col,
//             `start-tag=${startTag}, end-tag=${endTag}`
//         );
//     }
//     if (!tagName) {
//         node.notClose = true;
//         node.locationInfo.endOffset = context.index;
//         node.locationInfo.endCol = context.col;
//         node.locationInfo.endLine = context.line;
//         fireEvent(LxEventType.nodeEnd, context, node);
//     }
// };
// export const closeElement = (
//     context: LxParseContext,
//     tagName?: string,
//     endTag?: LxLocation
// ) => {
//     const currentNode = context.currentNode;
//     if (tagName && equalTagName(context, currentNode, tagName)) {
//         currentNode.locationInfo.endOffset = endTag.endOffset = context.index;
//         currentNode.locationInfo.endCol = endTag.endCol = context.col;
//         currentNode.locationInfo.endLine = endTag.endLine = context.line;
//         currentNode.locationInfo.endTag = endTag;
//         fireEvent(LxEventType.endTagEnd, context, context.currentNode);
//         fireEvent(LxEventType.nodeEnd, context, context.currentNode);
//         if (currentNode.parent) {
//             context.currentNode = currentNode.parent;
//         } else {
//             delete context.currentNode;
//         }
//         return;
//     }
//     closeNode(context.currentNode, context, tagName);
//     if (tagName) {
//         const parentIndex = findParentIndexByTagName(
//             context,
//             context.currentNode,
//             tagName
//         );
//         if (parentIndex !== -1) {
//             const len = parentIndex + 1;
//             let node = currentNode;
//             for (let index = 0; index < len; index++) {
//                 const children = node.children || [];
//                 delete node.children;
//                 const textChildren = [];
//                 const otherChildren = [];
//                 let breakEach;
//                 children.forEach((item) => {
//                     if (
//                         breakEach ||
//                         item.type === LxNodeType.element ||
//                         item.type === LxNodeType.comment
//                     ) {
//                         breakEach = true;
//                         otherChildren.push(item);
//                         return;
//                     }
//                     textChildren.push(item);
//                 });
//                 if (textChildren.length) {
//                     node.children = textChildren;
//                     const lastTextLoc =
//                         textChildren[textChildren.length - 1].locationInfo;
//                     node.locationInfo.endOffset = lastTextLoc.endOffset;
//                     node.locationInfo.endCol = lastTextLoc.endCol;
//                     node.locationInfo.endLine = lastTextLoc.endLine;
//                 } else {
//                     node.locationInfo.endOffset =
//                         node.locationInfo.startTag.endOffset;
//                     node.locationInfo.endCol =
//                         node.locationInfo.startTag.endCol;
//                     node.locationInfo.endLine =
//                         node.locationInfo.startTag.endLine;
//                 }
//                 node.parent.children = node.parent.children.concat(
//                     otherChildren
//                 );
//                 fireEvent(LxEventType.endTagEnd, context, node);
//                 fireEvent(LxEventType.nodeEnd, context, node);
//                 node.notClose = true;
//                 node = node.parent;
//                 context.currentNode = node;
//             }
//             node.locationInfo.endOffset = endTag.endOffset = context.index;
//             node.locationInfo.endCol = endTag.endCol = context.col;
//             node.locationInfo.endLine = endTag.endLine = context.line;
//             node.locationInfo.endTag = endTag;
//             fireEvent(LxEventType.endTagEnd, context, node);
//             fireEvent(LxEventType.nodeEnd, context, node);
//             if (node.parent) {
//                 context.currentNode = node.parent;
//             } else {
//                 delete context.currentNode;
//             }
//         }
//         return;
//     }
//     if (currentNode.parent) {
//         context.currentNode = currentNode.parent;
//         closeElement(context);
//     }
// };
