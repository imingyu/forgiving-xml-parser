import {
    LxCursorPosition,
    LxEventType,
    LxNodeNature,
    LxNodeType,
    LxParseContext,
    LxTryStep,
    LxWrong,
} from "../types";
import { currentIsLineBreak, moveCursor } from "../util";
import { TAG_NOT_CLOSE } from "../message";
import { boundStepsToContext } from "../init";
export const tryParseAloneNode = (
    xml: string,
    cursor: LxCursorPosition,
    nodeType: LxNodeType,
    nodeNature: LxNodeNature,
    startTagText: string,
    endTagText: string
): LxTryStep[] => {
    const steps: LxTryStep[] = [];
    const xmlLength = xml.length;
    steps.push({
        step: LxEventType.nodeStart,
        cursor: {
            ...cursor,
        },
        data: [nodeType, nodeNature],
    });
    steps.push({
        step: LxEventType.startTagStart,
        cursor: {
            ...cursor,
        },
    });
    moveCursor(cursor, 0, startTagText.length - 1, startTagText.length - 1);
    steps.push({
        step: LxEventType.startTagEnd,
        cursor: {
            ...cursor,
        },
    });
    moveCursor(cursor, 0, 1, 1);
    steps.push({
        step: LxEventType.nodeContentStart,
        cursor: {
            ...cursor,
        },
    });
    let content = "";
    let closeRight;
    for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
        const char = xml[cursor.offset];
        const nextEnd =
            xml[cursor.offset + 1] === endTagText[0] &&
            xml.substr(cursor.offset + 1, endTagText.length) === endTagText;
        if (nextEnd) {
            content += char;
            steps.push({
                step: LxEventType.nodeContentEnd,
                cursor: {
                    ...cursor,
                },
                data: content,
            });
            moveCursor(cursor, 0, 1, 1);
            steps.push({
                step: LxEventType.endTagStart,
                cursor: {
                    ...cursor,
                },
            });
            moveCursor(cursor, 0, endTagText.length - 1, endTagText.length - 1);
            steps.push({
                step: LxEventType.endTagEnd,
                cursor: {
                    ...cursor,
                },
            });
            steps.push({
                step: LxEventType.nodeEnd,
                cursor: {
                    ...cursor,
                },
                data: nodeType,
            });
            moveCursor(cursor, 0, 1, 1);
            closeRight = true;
            break;
        }
        content += char;
        const brType = currentIsLineBreak(xml, cursor.offset);
        if (brType != -1) {
            moveCursor(cursor, 1, -cursor.column, !brType ? 0 : 1);
        }
    }
    if (!closeRight) {
        // TODO:适配tag notclose
        const err = (new Error(TAG_NOT_CLOSE.message) as unknown) as LxWrong;
        err.code = TAG_NOT_CLOSE.code;
        Object.assign(err, cursor);
        steps.push({
            step: LxEventType.error,
            cursor: {
                ...cursor,
            },
            data: err,
        });
        steps.push({
            step: LxEventType.nodeContentEnd,
            cursor: {
                ...cursor,
            },
            data: content,
        });
        steps.push({
            step: LxEventType.nodeEnd,
            cursor: {
                ...cursor,
            },
            data: nodeType,
        });
    }
    return steps;
};
export const parseAloneNode = (
    context: LxParseContext,
    nodeType: LxNodeType,
    nodeNature: LxNodeNature,
    startTagText: string,
    endTagText: string
) => {
    const steps = tryParseAloneNode(
        context.xml,
        {
            lineNumber: context.lineNumber,
            column: context.column,
            offset: context.offset,
        },
        nodeType,
        nodeNature,
        startTagText,
        endTagText
    );
    boundStepsToContext(steps, context);
};
