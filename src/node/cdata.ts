import {
    LxNodeCloseType,
    LxNodeJSON,
    LxNodeNature,
    LxNodeAdapter,
    LxNodeType,
    LxParseContext,
} from "../types";
import { parseAloneNode } from "./alone";
import { CDATA_START, CDATA_END } from "../var";
export const CDATAParser: LxNodeAdapter = {
    nodeType: LxNodeType.cdata,
    nodeNature: LxNodeNature.alone,
    parseMatch: CDATA_START,
    parse: (context: LxParseContext) => {
        parseAloneNode(context, CDATA_START, CDATA_END, CDATAParser);
    },
    serializeMatch(currentNode: LxNodeJSON): boolean {
        return currentNode.type === LxNodeType.cdata;
    },
    serialize(currentNode: LxNodeJSON): string {
        return `${CDATA_START}${currentNode.content || ""}${
            !currentNode.closeType ||
            currentNode.closeType === LxNodeCloseType.fullClosed
                ? CDATA_END
                : ""
        }`;
    },
};
