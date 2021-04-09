import {
    currentIsLineBreak,
    findNodeAdapter,
    isElementEndTagBegin,
    moveCursor,
    toCursor,
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
    steps.push({
        step: FxEventType.nodeStart,
        cursor: {
            ...cursor,
        },
        data: TextAdapter,
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
        if (TextAdapter.contentEndChecker(xml, cursor, options, parentNode)) {
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
                data: [TextAdapter, FxNodeCloseType.fullClosed],
            });
            break;
        }
    }
    return steps;
};

const REG_SCRIPE_END_TAG = /^<\s*\/\s*script\s*/;
export const TextAdapter: FxNodeAdapter = {
    nodeNature: FxNodeNature.alone,
    nodeType: FxNodeType.text,
    contentEndChecker(
        xml: string,
        cursor: FxCursorPosition,
        options: FxParseOptions,
        parentNode?: FxNode
    ): boolean {
        const nextCharCousor: FxCursorPosition = moveCursor(toCursor(cursor), 0, 1, 1);
        let nextNewNodeParse;
        const parentIsScriptElement =
            parentNode && parentNode.type === FxNodeType.element && parentNode.name === "script";
        if (parentIsScriptElement) {
            // 如果当前text的父元素是script标签，则一直找到</script>才能开始下一个Parser
            const nextIsElementEndTag = isElementEndTagBegin(xml, nextCharCousor);
            nextNewNodeParse =
                nextIsElementEndTag && REG_SCRIPE_END_TAG.test(xml.substr(nextCharCousor.offset));
        } else {
            const adapter = findNodeAdapter(xml, nextCharCousor, options);
            nextNewNodeParse = adapter && adapter.nodeType !== FxNodeType.text ? true : false;
        }

        if (cursor.offset >= xml.length - 1 || nextNewNodeParse) {
            return true;
        }
        return false;
    },
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
