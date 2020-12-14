import {
    FxCursorPosition,
    FxEventType,
    FxNodeCloseType,
    FxNodeAdapter,
    FxParseContext,
    FxParseOptions,
    FxTryStep,
} from "../types";
import { currentIsLineBreak, moveCursor, pushStep } from "../util";
import { boundStepsToContext } from "../option";
export const tryParseAloneNode = (
    xml: string,
    options: FxParseOptions,
    cursor: FxCursorPosition,
    startTagText: string,
    endTagText: string,
    parser: FxNodeAdapter
): FxTryStep[] => {
    const steps: FxTryStep[] = [];
    const xmlLength = xml.length;
    pushStep(steps, FxEventType.nodeStart, cursor, parser);
    pushStep(steps, FxEventType.startTagStart, cursor);
    moveCursor(cursor, 0, startTagText.length - 1, startTagText.length - 1);
    pushStep(steps, FxEventType.startTagEnd, cursor, [
        parser,
        FxNodeCloseType.startTagClosed,
    ]);
    moveCursor(cursor, 0, 1, 1);
    pushStep(steps, FxEventType.nodeContentStart, cursor);
    let content = "";
    for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
        const char = xml[cursor.offset];
        const nextEnd =
            xml[cursor.offset + 1] === endTagText[0] &&
            xml.substr(cursor.offset + 1, endTagText.length) === endTagText;
        if (nextEnd) {
            content += char;
            pushStep(steps, FxEventType.nodeContentEnd, cursor, content);
            moveCursor(cursor, 0, 1, 1);
            pushStep(steps, FxEventType.endTagStart, cursor);
            moveCursor(cursor, 0, endTagText.length - 1, endTagText.length - 1);
            pushStep(steps, FxEventType.endTagEnd, cursor);
            pushStep(steps, FxEventType.nodeEnd, cursor, [
                parser,
                FxNodeCloseType.fullClosed,
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
    context: FxParseContext,
    startTagText: string,
    endTagText: string,
    parser: FxNodeAdapter
) => {
    const steps = tryParseAloneNode(
        context.xml,
        context.options,
        {
            lineNumber: context.lineNumber,
            column: context.column,
            offset: context.offset,
        },
        startTagText,
        endTagText,
        parser
    );
    boundStepsToContext(steps, context);
};
