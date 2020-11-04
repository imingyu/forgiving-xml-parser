import {
    LxNodeJSON,
    LxNodeNature,
    LxNodeParser,
    LxNodeType,
    LxParseContext,
} from "../types";
import { parseAloneNode } from "./alone";
import { CDATA_START, CDATA_END } from "../var";
export const parseCDATA = (context: LxParseContext) => {
    parseAloneNode(
        context,
        LxNodeType.cdata,
        LxNodeNature.alone,
        CDATA_START,
        CDATA_END
    );
};
export const CDATAParser: LxNodeParser = {
    nodeNature: LxNodeNature.alone,
    parseMatch: CDATA_START,
    parse: parseCDATA,
    serializeMatch(currentNode: LxNodeJSON): boolean {
        return currentNode.type === LxNodeType.cdata;
    },
    serialize(currentNode: LxNodeJSON): string {
        return `${CDATA_START}${currentNode.content || ""}${
            currentNode.notClose ? "" : CDATA_END
        }`;
    },
};
