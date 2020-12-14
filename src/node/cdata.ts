import {
    FxNodeCloseType,
    FxNodeJSON,
    FxNodeNature,
    FxNodeAdapter,
    FxNodeType,
    FxParseContext,
} from "../types";
import { parseAloneNode } from "./alone";
import { CDATA_START, CDATA_END } from "../var";
export const CDATAParser: FxNodeAdapter = {
    nodeType: FxNodeType.cdata,
    nodeNature: FxNodeNature.alone,
    parseMatch: CDATA_START,
    parse: (context: FxParseContext) => {
        parseAloneNode(context, CDATA_START, CDATA_END, CDATAParser);
    },
    serializeMatch(currentNode: FxNodeJSON): boolean {
        return currentNode.type === FxNodeType.cdata;
    },
    serialize(currentNode: FxNodeJSON): string {
        return `${CDATA_START}${currentNode.content || ""}${
            !currentNode.closeType ||
            currentNode.closeType === FxNodeCloseType.fullClosed
                ? CDATA_END
                : ""
        }`;
    },
};
