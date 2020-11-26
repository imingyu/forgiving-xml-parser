import {
    LxCursorPosition,
    LxEventType,
    LxNodeCloseType,
    LxNodeParser,
    LxNodeType,
    LxParseContext,
    LxParseOptions,
    LxTryStep,
} from "../types";
import { currentIsLineBreak, moveCursor, pushStep } from "../util";
import { boundStepsToContext } from "../init";
export const tryParseAloneNode = (
    xml: string,
    options: LxParseOptions,
    cursor: LxCursorPosition,
    nodeType: LxNodeType,
    startTagText: string,
    endTagText: string,
    parser: LxNodeParser
): LxTryStep[] => {
    const steps: LxTryStep[] = [];
    const xmlLength = xml.length;
    pushStep(steps, LxEventType.nodeStart, cursor, [nodeType, parser]);
    pushStep(steps, LxEventType.startTagStart, cursor);
    moveCursor(cursor, 0, startTagText.length - 1, startTagText.length - 1);
    pushStep(steps, LxEventType.startTagEnd, cursor, [
        nodeType,
        LxNodeCloseType.startTagClosed,
    ]);
    moveCursor(cursor, 0, 1, 1);
    pushStep(steps, LxEventType.nodeContentStart, cursor);
    let content = "";
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
            pushStep(steps, LxEventType.nodeEnd, cursor, [
                nodeType,
                LxNodeCloseType.fullClosed,
            ]);
            moveCursor(cursor, 0, 1, 1);
            break;
        }
        content += char;
        const brType = currentIsLineBreak(xml, cursor.offset);
        if (brType != -1) {
            moveCursor(cursor, 1, -cursor.column, !brType ? 0 : 1);
        }
    }
    return steps;
};
export const parseAloneNode = (
    context: LxParseContext,
    nodeType: LxNodeType,
    startTagText: string,
    endTagText: string,
    parser: LxNodeParser
) => {
    const steps = tryParseAloneNode(
        context.xml,
        context.options,
        {
            lineNumber: context.lineNumber,
            column: context.column,
            offset: context.offset,
        },
        nodeType,
        startTagText,
        endTagText,
        parser
    );
    boundStepsToContext(steps, context);
};
