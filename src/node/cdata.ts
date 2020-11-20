import {
    LxNodeCloseType,
    LxNodeJSON,
    LxNodeNature,
    LxNodeParser,
    LxNodeType,
    LxParseContext,
} from "../types";
import { parseAloneNode } from "./alone";
import { CDATA_START, CDATA_END } from "../var";
export const CDATAParser: LxNodeParser = {
    nodeType: LxNodeType.cdata,
    nodeNature: LxNodeNature.alone,
    parseMatch: CDATA_START,
    parse: (context: LxParseContext) => {
        parseAloneNode(
            context,
            LxNodeType.cdata,
            CDATA_START,
            CDATA_END,
            CDATAParser
        );
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
