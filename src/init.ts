import { fireEvent } from "./option";
import {
    LxNode,
    LxParseContext,
    LxNodeType,
    LxEventType,
    LxTryStep,
    LxNodeLocationInfo,
    LxCursorPosition,
    LxWrong,
    LxNodeNature,
    LxBoundStepsLoopCallback,
} from "./types";

export const createNodeByNodeStartStep = (step: LxTryStep): LxNode => {
    const [nodeType, nodeNature] = step.data as [LxNodeType, LxNodeNature];
    return {
        type: nodeType,
        nature: nodeNature,
        locationInfo: {
            startLineNumber: step.cursor.lineNumber,
            startColumn: step.cursor.column,
            startOffset: step.cursor.offset,
        },
        steps: [],
    };
};

export const boundStepsToContext = (
    steps: LxTryStep[],
    context?: LxParseContext,
    loopCallback?: LxBoundStepsLoopCallback
): LxNode[] => {
    let noContext;
    if (!context) {
        noContext = true;
        context = {} as LxParseContext;
    }
    const nodes: LxNode[] = [];
    for (let index = 0, len = steps.length; index < len; index++) {
        const currentStepItem = steps[index];
        const { step, cursor, data } = currentStepItem;
        if (step === LxEventType.nodeStart) {
            const [nodeType] = data as [LxNodeType, LxNodeNature];
            const node = createNodeByNodeStartStep(currentStepItem);
            node.steps.push(currentStepItem);
            if (context.currentNode) {
                node.parent = context.currentNode;
                if (nodeType === LxNodeType.attr) {
                    if (!context.currentNode.attrs) {
                        context.currentNode.attrs = [];
                    }
                    context.currentNode.attrs.push(node);
                    if (!context.currentNode.locationInfo.attrs) {
                        context.currentNode.locationInfo.attrs = [];
                    }
                    context.currentNode.locationInfo.attrs.push(
                        node.locationInfo
                    );
                } else {
                    if (!context.currentNode.children) {
                        context.currentNode.children = [];
                    }
                    context.currentNode.children.push(node);
                }
            } else {
                nodes.push(node);
                context.nodes && context.nodes.push(node);
            }
            context.currentNode = node;
        } else if (step === LxEventType.startTagStart) {
            if (context.currentNode) {
                context.currentNode.steps.push(currentStepItem);
                context.currentNode.locationInfo.startTag = {
                    startLineNumber: cursor.lineNumber,
                    startColumn: cursor.column,
                    startOffset: cursor.offset,
                };
            }
        } else if (step === LxEventType.nodeNameEnd) {
            if (context.currentNode) {
                context.currentNode.steps.push(currentStepItem);
                context.currentNode.name = data as string;
            }
        } else if (step === LxEventType.attrEqual) {
            if (context.currentNode) {
                context.currentNode.steps.push(currentStepItem);
                if (!context.currentNode.equalCount) {
                    context.currentNode.equalCount = 0;
                }
                context.currentNode.equalCount++;
            }
        } else if (step === LxEventType.attrLeftBoundary) {
            if (data && context.currentNode) {
                context.currentNode.steps.push(currentStepItem);
                context.currentNode.boundaryChar = data as string;
            }
        } else if (step === LxEventType.startTagEnd) {
            if (context.currentNode) {
                context.currentNode.steps.push(currentStepItem);
                setNodeLocationByCursor(
                    context.currentNode.locationInfo,
                    cursor,
                    "startTag"
                );
            }
        } else if (step === LxEventType.nodeContentEnd) {
            if (data && context.currentNode) {
                context.currentNode.steps.push(currentStepItem);
                context.currentNode.content = data as string;
            }
        } else if (step === LxEventType.endTagStart) {
            if (context.currentNode) {
                context.currentNode.steps.push(currentStepItem);
                context.currentNode.locationInfo.endTag = {
                    startLineNumber: cursor.lineNumber,
                    startColumn: cursor.column,
                    startOffset: cursor.offset,
                };
            }
        } else if (step === LxEventType.endTagEnd) {
            if (context.currentNode) {
                context.currentNode.steps.push(currentStepItem);
                setNodeLocationByCursor(
                    context.currentNode.locationInfo,
                    cursor,
                    "endTag"
                );
            }
        } else if (step === LxEventType.nodeEnd) {
            if (context.currentNode) {
                setNodeLocationByCursor(
                    context.currentNode.locationInfo,
                    cursor
                );
                if (Array.isArray(data)) {
                    if (data[1]) {
                        context.currentNode.selfcloseing = true;
                    }
                    if (data[2]) {
                        context.currentNode.notClose = true;
                    }
                }
                context.currentNode.steps.push(currentStepItem);
                if (context.currentNode.parent) {
                    context.currentNode = context.currentNode.parent;
                } else {
                    delete context.currentNode;
                }
            }
        } else {
            context.currentNode &&
                context.currentNode.steps.push(currentStepItem);
        }
        if (!noContext) {
            Object.assign(context, cursor);
            if (step === LxEventType.error) {
                fireEvent(step, context, data as LxWrong);
            } else {
                fireEvent(step, context, context.currentNode);
            }
        }
        if (loopCallback && loopCallback(currentStepItem, index)) {
            break;
        }
    }
    return nodes;
};

export const setNodeLocationByCursor = (
    locationInfo: LxNodeLocationInfo,
    cursor: LxCursorPosition,
    prop?: "startTag" | "endTag"
) => {
    const loc = prop ? locationInfo[prop] : locationInfo;
    loc.endLineNumber = cursor.lineNumber;
    loc.endColumn = cursor.column;
    loc.endOffset = cursor.offset;
};

// export const initNode = (type: LxNodeType, context: LxParseContext): LxNode => {
//     const node: LxNode = {
//         type,
//         locationInfo: {
//             startLine: context.line,
//             startCol: context.col,
//             startOffset: context.index,
//         },
//     };
//     if (type === LxNodeType.attr) {
//         node.equalCount = 0;
//     }
//     if (type !== LxNodeType.text) {
//         node.locationInfo.startTag = {
//             startLine: context.line,
//             startCol: context.col,
//             startOffset: context.index,
//         };
//     }
//     fireEvent(LxEventType.nodeStart, context, node);
//     if (type === LxNodeType.text) {
//         node.content = "";
//         fireEvent(LxEventType.nodeContentStart, context, node);
//         return node;
//     }
//     fireEvent(LxEventType.startTagStart, context, node);
//     if (type === LxNodeType.element) {
//         plusArgNumber(context, 1, 0, 1);
//         fireEvent(LxEventType.nodeNameStart, context, node);
//         return node;
//     }
//     if (type === LxNodeType.processingInstruction) {
//         plusArgNumber(context, PI_START.length, 0, PI_START.length);
//         fireEvent(LxEventType.nodeNameStart, context, node);
//         return node;
//     }
//     if (type === LxNodeType.dtd) {
//         plusArgNumber(context, DTD_START.length, 0, DTD_START.length);
//         fireEvent(LxEventType.nodeNameStart, context, node);
//         return node;
//     }
//     if (type === LxNodeType.comment) {
//         plusArgNumber(context, COMMENT_START.length, 0, COMMENT_START.length);
//         node.locationInfo.startTag.endLine = context.line;
//         node.locationInfo.startTag.endCol = context.col;
//         node.locationInfo.startTag.endOffset = context.index;
//         fireEvent(LxEventType.startTagEnd, context, node);
//         node.content = "";
//         fireEvent(LxEventType.nodeContentStart, context, node);
//         return node;
//     }
//     if (type === LxNodeType.cdata) {
//         plusArgNumber(context, CDATA_START.length, 0, CDATA_START.length);
//         node.locationInfo.startTag.endLine = context.line;
//         node.locationInfo.startTag.endCol = context.col;
//         node.locationInfo.startTag.endOffset = context.index;
//         fireEvent(LxEventType.startTagEnd, context, node);
//         node.content = "";
//         fireEvent(LxEventType.nodeContentStart, context, node);
//         return node;
//     }
//     return node;
// };

// export const setEndLocation = (
//     context: LxParseContext,
//     prop?: "startTag" | "endTag",
//     node: LxNode = context.currentNode
// ) => {
//     if (prop) {
//         if (!node.locationInfo[prop]) {
//             return;
//         }
//         node.locationInfo[prop].endOffset = context.index;
//         node.locationInfo[prop].endLine = context.line;
//         node.locationInfo[prop].endCol = context.col;
//         return;
//     }
//     node.locationInfo.endOffset = context.index;
//     node.locationInfo.endLine = context.line;
//     node.locationInfo.endCol = context.col;
// };
// export const setStartLocation = (
//     context: LxParseContext,
//     prop?: "startTag" | "endTag",
//     node: LxNode = context.currentNode
// ) => {
//     if (prop) {
//         if (!node.locationInfo[prop]) {
//             node.locationInfo[prop] = {
//                 startOffset: context.index,
//                 startLine: context.line,
//                 startCol: context.col,
//             };
//             return;
//         }
//         node.locationInfo[prop].startOffset = context.index;
//         node.locationInfo[prop].startLine = context.line;
//         node.locationInfo[prop].startCol = context.col;
//         return;
//     }
//     node.locationInfo.startOffset = context.index;
//     node.locationInfo.startLine = context.line;
//     node.locationInfo.startCol = context.col;
// };

// export const pushNode = (node: LxNode, context: LxParseContext) => {
//     if (node.type === LxNodeType.attr) {
//         if (!context.currentNode.attrs) {
//             context.currentNode.attrs = [];
//         }
//         if (!context.currentNode.locationInfo.attrs) {
//             context.currentNode.locationInfo.attrs = [];
//         }
//         context.currentNode.attrs.push(node);
//         context.currentNode.locationInfo.attrs.push(node.locationInfo);
//         return;
//     }
//     if (!context.currentNode) {
//         context.currentNode = node;
//         context.nodes.push(node);
//     } else if (context.currentNode.type === LxNodeType.text) {
//         if (context.currentNode.parent) {
//             node.parent = context.currentNode.parent;
//             context.currentNode.parent.children.push(node);
//             context.currentNode = node;
//         } else {
//             context.currentNode = node;
//             context.nodes.push(node);
//         }
//     } else {
//         node.parent = context.currentNode;
//         if (!context.currentNode.children) {
//             context.currentNode.children = [];
//         }
//         context.currentNode.children.push(node);
//         context.currentNode = node;
//     }
// };

// export const closeStartTag = (context: LxParseContext) => {
//     const currentNode = context.currentNode;
//     if (
//         currentNode.type === LxNodeType.comment ||
//         currentNode.type === LxNodeType.cdata ||
//         currentNode.type === LxNodeType.processingInstruction
//     ) {
//         const endStr =
//             currentNode.type === LxNodeType.comment
//                 ? COMMENT_START
//                 : currentNode.type === LxNodeType.cdata
//                 ? CDATA_START
//                 : PI_START;
//         plusArgNumber(context, endStr.length - 1, 0, endStr.length - 1);
//         setEndLocation(context, "startTag");
//         fireEvent(LxEventType.startTagEnd, context, currentNode);
//         return;
//     }
//     setEndLocation(context, "startTag");
//     fireEvent(LxEventType.startTagEnd, context, currentNode);
// };
// export const execStartTagEnd = (context: LxParseContext) => {
//     const currentNode = context.currentNode;
//     if (currentNode.selfcloseing) {
//         plusArgNumber(context, 1, 0, 1);
//     }
//     if (currentNode.type === LxNodeType.comment) {
//         plusArgNumber(
//             context,
//             COMMENT_END.length - 1,
//             0,
//             COMMENT_END.length - 1
//         );
//     }
//     if (currentNode.type === LxNodeType.cdata) {
//         plusArgNumber(context, CDATA_END.length - 1, 0, CDATA_END.length - 1);
//     }
//     if (currentNode.type === LxNodeType.processingInstruction) {
//         plusArgNumber(context, PI_END.length - 1, 0, PI_END.length - 1);
//     }
//     setEndLocation(context, "startTag");
//     fireEvent(LxEventType.startTagEnd, context, currentNode);
//     if (currentNode.selfcloseing || currentNode.type === LxNodeType.dtd) {
//         fireEvent(LxEventType.nodeEnd, context, currentNode);
//     }
// };
