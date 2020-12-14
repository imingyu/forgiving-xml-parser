import {
    currentIsLineBreak,
    findNodeParser,
    isElementEndTagBegin,
    moveCursor,
    startsWith,
} from "../util";
import { boundStepsToContext } from "../option";
import {
    FxCursorPosition,
    FxEventType,
    FxNode,
    FxNodeCloseType,
    FxNodeJSON,
    FxNodeNature,
    FxNodeAdapter,
    FxNodeType,
    FxParseContext,
    FxParseOptions,
    FxTryStep,
} from "../types";

export const tryParseText = (
    xml: string,
    cursor: FxCursorPosition,
    options: FxParseOptions,
    parentNode?: FxNode
): FxTryStep[] => {
    const steps: FxTryStep[] = [];
    const xmlLength = xml.length;
    const parentIsScriptElement =
        parentNode &&
        parentNode.type === FxNodeType.element &&
        parentNode.name === "script";
    steps.push({
        step: FxEventType.nodeStart,
        cursor: {
            ...cursor,
        },
        data: TextParser,
    });
    steps.push({
        step: FxEventType.nodeContentStart,
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
        const nextCharCousor: FxCursorPosition = {
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
                step: FxEventType.nodeContentEnd,
                cursor: {
                    ...cursor,
                },
                data: content,
            });
            steps.push({
                step: FxEventType.nodeEnd,
                cursor: {
                    ...cursor,
                },
                data: [TextParser, FxNodeCloseType.fullClosed],
            });
            break;
        }
    }
    return steps;
};

export const TextParser: FxNodeAdapter = {
    nodeNature: FxNodeNature.alone,
    nodeType: FxNodeType.text,
    parseMatch() {
        return true;
    },
    parse(context: FxParseContext) {
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
    serialize(currentNode: FxNodeJSON): string {
        return currentNode.content || "";
    },
};
