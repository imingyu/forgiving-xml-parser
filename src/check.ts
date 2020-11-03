// import { fireEvent } from "./option";
// import { LxEventType, LxNode, LxNodeType, LxParseContext } from "./types";
// import { currentIsLineBreak, equalSubStr, plusArgNumber } from "./util";
// import { ALONE_NODE_MAP, DTD_END, ELEMENT_END, PI_END } from "./var";

// export const checkPIEnd = (context: LxParseContext): boolean => {
//     return (
//         context.xml[context.index] === "?" &&
//         context.currentNode &&
//         context.currentNode.type === LxNodeType.processingInstruction &&
//         equalSubStr(context.xml, context.index, PI_END)
//     );
// };

// export const checkElementEnd = (
//     context: LxParseContext,
//     currentNode?: LxNode
// ): boolean => {
//     const char = context.xml[context.index];
//     currentNode = currentNode || context.currentNode;
//     if (
//         char === "<" &&
//         currentNode &&
//         equalSubStr(context.xml, context.index, ELEMENT_END)
//     ) {
//         if (currentNode.type === LxNodeType.element) {
//             return true;
//         }
//         if (currentNode.parent) {
//             return checkElementEnd(context, currentNode.parent);
//         }
//     }
//     return false;
// };

// export const checkDtdEnd = (
//     context: LxParseContext,
//     currentNode?: LxNode
// ): boolean => {
//     const char = context.xml[context.index];
//     currentNode = currentNode || context.currentNode;
//     // TODO: 需要判断dtd结尾字符“]>”之间是否存在空白字符
//     if (
//         char === "]" &&
//         currentNode &&
//         equalSubStr(context.xml, context.index, DTD_END)
//     ) {
//         if (currentNode.type === LxNodeType.dtd && currentNode.children) {
//             return true;
//         }
//         if (currentNode.parent) {
//             return checkDtdEnd(context, currentNode.parent);
//         }
//     }
//     return false;
// };

// export const checkLineBreak = (
//     context: LxParseContext,
//     plusNumber = true
// ): boolean => {
//     const char = context.xml[context.index];
//     let len = currentIsLineBreak(context.xml, context.index);
//     if (len !== -1) {
//         if (!len) {
//             plusNumber && plusArgNumber(context, 0, 1, -context.col);
//             return true;
//         }
//         if (plusNumber) {
//             plusArgNumber(context, 1, 1, 1);
//             plusArgNumber(context, 0, 0, -context.col);
//         }
//         return true;
//     }
//     return false;
// };

// export const checkNodeContentEnd = (
//     context: LxParseContext,
//     content?: string
// ) => {
//     const { currentNode, xmlLength } = context;
//     let isEnd;
//     if (
//         ALONE_NODE_MAP[currentNode.type] &&
//         equalSubStr(
//             context.xml,
//             context.index + 1,
//             ALONE_NODE_MAP[currentNode.type]
//         )
//     ) {
//         isEnd = true;
//     }
//     if (context.index === xmlLength - 1) {
//         isEnd = true;
//     }
//     if (isEnd) {
//         if (content) {
//             currentNode.content = content;
//         }
//         fireEvent(LxEventType.nodeContentEnd, context, currentNode);
//     }
// };

// /**
//  * 拿node类型对应的结束字符集匹配当前字符集，判断出是否遇到了attrs终止的情况
//  * @param {LxParseContext} context
//  * @returns {number} 结束字符集长度
//  */
// export const checkAttrsEnd = (context: LxParseContext): number => {
//     const { currentNode, xml, index } = context;
//     const char = xml[index];
//     if (
//         currentNode.type === LxNodeType.processingInstruction &&
//         equalSubStr(xml, index, PI_END)
//     ) {
//         return 2;
//     }
//     if (currentNode.type === LxNodeType.dtd && (char === "[" || char === ">")) {
//         return 1;
//     }
//     if (char === ">") {
//         return 1;
//     }
//     if (char === "/" && xml[index + 1] === ">") {
//         return 2;
//     }
// };
