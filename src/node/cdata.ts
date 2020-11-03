import {
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
    match: CDATA_START,
    nodeNature: LxNodeNature.alone,
    parse: parseCDATA,
};
