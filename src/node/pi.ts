import { ignoreSpaceIsHeadTail } from "../util";
import { boundStepsToContext } from "../option";
import {
    FxCursorPosition,
    FxNodeCloseType,
    FxNodeJSON,
    FxNodeNature,
    FxNodeAdapter,
    FxNodeParserAllowNodeNotCloseOption,
    FxNodeSerializer,
    FxNodeType,
    FxParseContext,
    FxParseOptions,
    FxSerializeOptions,
    FxTryStep,
} from "../types";
import { serializeNodeAttrs } from "./attr";
import { tryParseStartTag } from "./tag";

export const tryParsePI = (
    xml: string,
    cursor: FxCursorPosition,
    options: FxParseOptions
): FxTryStep[] => {
    return tryParseStartTag(ProcessingInstructionParser, xml, cursor, options);
};

export const ProcessingInstructionParser: FxNodeAdapter = {
    nodeNature: FxNodeNature.alone,
    nodeType: FxNodeType.processingInstruction,
    parseMatch: /^<\s*\?/,
    attrLeftBoundaryChar: /^'|^"/,
    attrRightBoundaryChar: /^'|^"/,
    attrBoundaryCharNeedEqual: true,
    allowNodeNotClose: FxNodeParserAllowNodeNotCloseOption.allow,
    checkAttrsEnd(xml: string, cursor: FxCursorPosition) {
        return ignoreSpaceIsHeadTail(xml, cursor, "?", ">");
    },
    parse(context: FxParseContext) {
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
    serializeMatch(node: FxNodeJSON): boolean {
        return node.type === FxNodeType.processingInstruction;
    },
    serialize(
        node: FxNodeJSON,
        siblingNodes: FxNodeJSON[],
        rootNodes: FxNodeJSON[],
        rootSerializer: FxNodeSerializer,
        options: FxSerializeOptions
    ): string {
        let res = "<?";
        if (node.name) {
            res += node.name;
        }
        res += serializeNodeAttrs(node, rootNodes, rootSerializer, options);
        if (!node.closeType || node.closeType === FxNodeCloseType.fullClosed) {
            res += `?>`;
        }
        return res;
    },
};
