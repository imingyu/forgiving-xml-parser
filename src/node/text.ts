import {
    currentIsLineBreak,
    findNodeParser,
    isElementEndTagBegin,
    moveCursor,
    startsWith,
} from "../util";
import { boundStepsToContext } from "../option";
import {
    LxCursorPosition,
    LxEventType,
    LxNode,
    LxNodeCloseType,
    LxNodeJSON,
    LxNodeNature,
    LxNodeAdapter,
    LxNodeType,
    LxParseContext,
    LxParseOptions,
    LxTryStep,
} from "../types";

export const tryParseText = (
    xml: string,
    cursor: LxCursorPosition,
    options: LxParseOptions,
    parentNode?: LxNode
): LxTryStep[] => {
    const steps: LxTryStep[] = [];
    const xmlLength = xml.length;
    const parentIsScriptElement =
        parentNode &&
        parentNode.type === LxNodeType.element &&
        parentNode.name === "script";
    steps.push({
        step: LxEventType.nodeStart,
        cursor: {
            ...cursor,
        },
        data: TextParser,
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
        let nextNewNodeParse;
        if (parentIsScriptElement) {
            // 如果当前text的父元素是script标签，则一直找到</script>才能开始下一个Parser
            const nextIsElementEndTag = isElementEndTagBegin(
                xml,
                nextCharCousor
            );
            nextNewNodeParse =
                nextIsElementEndTag &&
                /^<\s*\/\s*script/.test(xml.substr(nextCharCousor.offset));
        } else {
            nextNewNodeParse = !!findNodeParser(xml, nextCharCousor, options);
        }

        if (cursor.offset >= xmlLength - 1 || nextNewNodeParse) {
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
                data: [TextParser, LxNodeCloseType.fullClosed],
            });
            break;
        }
    }
    return steps;
};

export const TextParser: LxNodeAdapter = {
    nodeNature: LxNodeNature.alone,
    nodeType: LxNodeType.text,
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
            context.options,
            context.currentNode
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
