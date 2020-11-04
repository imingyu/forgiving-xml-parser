import { currentIsLineBreak, findNodeParser, moveCursor } from "../util";
import { boundStepsToContext } from "../init";
import {
    LxCursorPosition,
    LxEventType,
    LxNodeJSON,
    LxNodeNature,
    LxNodeParser,
    LxNodeType,
    LxParseContext,
    LxParseOptions,
    LxTryStep,
} from "../types";

export const tryParseText = (
    xml: string,
    cursor: LxCursorPosition,
    options: LxParseOptions
): LxTryStep[] => {
    const steps: LxTryStep[] = [];
    const xmlLength = xml.length;
    steps.push({
        step: LxEventType.nodeStart,
        cursor: {
            ...cursor,
        },
        data: [LxNodeType.text, LxNodeNature.alone],
    });
    steps.push({
        step: LxEventType.nodeContentStart,
        cursor: {
            ...cursor,
        },
    });
    let content = "";
    for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
        const char = xml[cursor.offset];
        content += char;
        const brType = currentIsLineBreak(xml, cursor.offset);
        if (brType !== -1) {
            moveCursor(cursor, 1, -cursor.column, !brType ? 0 : 1);
        }
        const nextCharCousor: LxCursorPosition = {
            lineNumber: cursor.lineNumber,
            offset: cursor.offset + 1,
            column: cursor.column + 1,
        };
        if (
            cursor.offset >= xmlLength - 1 ||
            findNodeParser(xml, nextCharCousor, options)
        ) {
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
                data: LxNodeType.text,
            });
            break;
        }
    }
    return steps;
};

export const TextParser: LxNodeParser = {
    nodeNature: LxNodeNature.alone,
    parseMatch() {
        return true;
    },
    parse(context: LxParseContext) {
        const steps = tryParseText(
            context.xml,
            {
                lineNumber: context.lineNumber,
                column: context.column,
                offset: context.offset,
            },
            context.options
        );
        boundStepsToContext(steps, context);
    },
    serializeMatch(): boolean {
        return true;
    },
    serialize(currentNode: LxNodeJSON): string {
        return currentNode.content || "";
    },
};
