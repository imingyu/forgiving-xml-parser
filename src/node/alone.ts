import {
    LxCursorPosition,
    LxEventType,
    LxNodeNature,
    LxNodeType,
    LxParseContext,
    LxTryStep,
} from "../types";
import { currentIsLineBreak, moveCursor, pushStep } from "../util";
import { TAG_NOT_CLOSE } from "../message";
import { boundStepsToContext } from "../init";
export const tryParseAloneNode = (
    xml: string,
    cursor: LxCursorPosition,
    nodeType: LxNodeType,
    startTagText: string,
    endTagText: string
): LxTryStep[] => {
    const steps: LxTryStep[] = [];
    const xmlLength = xml.length;
    pushStep(steps, LxEventType.nodeStart, cursor, [
        nodeType,
        LxNodeNature.alone,
    ]);
    pushStep(steps, LxEventType.startTagStart, cursor);
    moveCursor(cursor, 0, startTagText.length - 1, startTagText.length - 1);
    pushStep(steps, LxEventType.startTagEnd, cursor);
    moveCursor(cursor, 0, 1, 1);
    pushStep(steps, LxEventType.nodeContentStart, cursor);
    let content = "";
    let closeRight;
    for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
        const char = xml[cursor.offset];
        const nextEnd =
            xml[cursor.offset + 1] === endTagText[0] &&
            xml.substr(cursor.offset + 1, endTagText.length) === endTagText;
        if (nextEnd) {
            content += char;
            pushStep(steps, LxEventType.nodeContentEnd, cursor, content);
            moveCursor(cursor, 0, 1, 1);
            pushStep(steps, LxEventType.endTagStart, cursor);
            moveCursor(cursor, 0, endTagText.length - 1, endTagText.length - 1);
            pushStep(steps, LxEventType.endTagEnd, cursor);
            pushStep(steps, LxEventType.nodeEnd, cursor, nodeType);
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
        pushStep(steps, LxEventType.error, cursor, TAG_NOT_CLOSE);
        pushStep(steps, LxEventType.nodeContentEnd, cursor, content);
        pushStep(steps, LxEventType.nodeEnd, cursor, nodeType);
    }
    return steps;
};
export const parseAloneNode = (
    context: LxParseContext,
    nodeType: LxNodeType,
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
        startTagText,
        endTagText
    );
    boundStepsToContext(steps, context);
};
