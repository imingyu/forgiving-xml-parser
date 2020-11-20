import {
    repeatString,
    checkPIStartTagStart,
    moveCursor,
    equalCursor,
    pushStep,
    createStep,
} from "../util";
import { boundStepsToContext } from "../init";
import {
    LxCursorPosition,
    LxEventType,
    LxNodeCloseType,
    LxNodeJSON,
    LxNodeNature,
    LxNodeParser,
    LxNodeSerializer,
    LxNodeType,
    LxParseContext,
    LxParseOptions,
    LxSerializeOptions,
    LxTryStep,
} from "../types";
import { checkOptionAllow } from "src/option";
import { DEFAULT_PARSE_OPTIONS } from "src/var";
import { AttrParser } from "./attr";

export const tryParsePI = (
    xml: string,
    cursor: LxCursorPosition,
    options: LxParseOptions
): LxTryStep[] => {
    let steps: LxTryStep[];
    pushStep(steps, LxEventType.nodeStart, cursor, [
        LxNodeType.processingInstruction,
        ProcessingInstructionParser,
    ]);
    pushStep(steps, LxEventType.startTagStart, cursor);
    const startTagEndCursor = checkPIStartTagStart(xml, cursor);
    const expectStartTagEndCursor = moveCursor(
        {
            ...cursor,
        },
        0,
        1,
        1
    );
    moveCursor(cursor, 0, 1, 1);
    const nodeNameStartStep: LxTryStep = createStep(
        LxEventType.nodeNameStart,
        cursor
    );
    // if (!equalCursor(startTagEndCursor, expectStartTagEndCursor)) {
    //     // 检测option
    //     if (
    //         !checkOptionAllow(
    //             options,
    //             "allowStartTagLeftBoundarySpace",
    //             DEFAULT_PARSE_OPTIONS.allowStartTagLeftBoundarySpace,
    //             attrName,
    //             elementNodeNameStartStep.cursor
    //         )
    //     ) {
    //         return pushStep(
    //             steps,
    //             LxEventType.error,
    //             elementNodeNameStartStep.cursor,
    //             BOUNDARY_HAS_SPACE
    //         );
    //     }
    // }
    return steps;
};

export const ProcessingInstructionParser: LxNodeParser = {
    nodeNature: LxNodeNature.alone,
    nodeType: LxNodeType.processingInstruction,
    parseMatch: /^<\s*\?/,
    parse(context: LxParseContext) {
        boundStepsToContext(
            tryParsePI(
                context.xml,
                {
                    lineNumber: context.lineNumber,
                    column: context.column,
                    offset: context.offset,
                },
                context.options
            ),
            context
        );
    },
    serializeMatch(node: LxNodeJSON): boolean {
        return node.type === LxNodeType.processingInstruction;
    },
    serialize(
        node: LxNodeJSON,
        brotherNodes: LxNodeJSON[],
        rootNodes: LxNodeJSON[],
        rootSerializer: LxNodeSerializer,
        options: LxSerializeOptions
    ): string {
        let res = "<?";
        if (node.name) {
            res += node.name;
        }
        if (node.attrs && node.attrs.length) {
            node.attrs.forEach((attr) => {
                res +=
                    " " +
                    AttrParser.serialize(
                        attr,
                        node.attrs,
                        rootNodes,
                        rootSerializer,
                        options,
                        node
                    );
            });
        }
        if (!node.closeType || node.closeType === LxNodeCloseType.fullClosed) {
            res += `?>`;
        }
        return res;
    },
};
