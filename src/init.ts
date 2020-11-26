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
    LxBoundStepsLoopCallback,
    LxNodeCloseType,
    LxNodeParser,
} from "./types";

export const createNodeByNodeStartStep = (step: LxTryStep): LxNode => {
    const [nodeType, nodeParser] = step.data as [LxNodeType, LxNodeParser];
    return {
        type: nodeType,
        parser: nodeParser,
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
    console.log(steps);
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
            const [nodeType] = data as [LxNodeType, LxNodeParser];
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
                context.currentNode.boundaryChar = [data as string];
            }
        } else if (step === LxEventType.attrRightBoundary) {
            if (data && context.currentNode) {
                context.currentNode.steps.push(currentStepItem);
                context.currentNode.boundaryChar.push(data as string);
            }
        } else if (step === LxEventType.startTagEnd) {
            if (context.currentNode) {
                if (
                    Array.isArray(data) &&
                    (data[1] as LxNodeCloseType) in LxNodeCloseType
                ) {
                    context.currentNode.closeType = data[1] as LxNodeCloseType;
                }
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
                if (
                    Array.isArray(data) &&
                    data[1] &&
                    (data[1] as LxNodeCloseType) in LxNodeCloseType
                ) {
                    if (
                        !(
                            context.currentNode.closeType ===
                                LxNodeCloseType.startTagClosed &&
                            (data[1] as LxNodeCloseType) ===
                                LxNodeCloseType.notClosed
                        )
                    ) {
                        context.currentNode.closeType = data[1] as LxNodeCloseType;
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
                throw data;
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
