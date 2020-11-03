// import { LxEventType, LxNodeType, LxParseContext } from "./types";
// import { checkLineBreak, checkNodeContentEnd } from "./check";
// import { initNode, pushNode, setEndLocation, setStartLocation } from "./init";
// import { fireEvent } from "./option";
// import { equalSubStr, plusArgNumber } from "./util";
// import { ALONE_NODE_MAP } from "./var";

// export const parseAloneNode = (
//     nodeType: LxNodeType,
//     context: LxParseContext
// ) => {
//     const { xml, xmlLength } = context;
//     const aloneNodeEndStr = ALONE_NODE_MAP[nodeType];
//     pushNode(initNode(nodeType, context), context);
//     const currentNode = context.currentNode;
//     for (; context.index < xmlLength; plusArgNumber(context, 1, 0, 1)) {
//         const char = xml[context.index];
//         if (
//             char === aloneNodeEndStr[0] &&
//             equalSubStr(context.xml, context.index, aloneNodeEndStr)
//         ) {
//             setStartLocation(context, "endTag");
//             fireEvent(LxEventType.endTagStart, context, currentNode);
//             plusArgNumber(
//                 context,
//                 aloneNodeEndStr.length - 1,
//                 0,
//                 aloneNodeEndStr.length - 1
//             );
//             setEndLocation(context, "endTag");
//             setEndLocation(context);
//             fireEvent(LxEventType.endTagEnd, context, currentNode);
//             fireEvent(LxEventType.nodeEnd, context, currentNode);
//             break;
//         }
//         currentNode.content += char;
//         checkLineBreak(context);
//         checkNodeContentEnd(context);
//     }
//     delete context.currentNode;
//     if (currentNode.parent) {
//         context.currentNode = currentNode.parent;
//     }
// };
