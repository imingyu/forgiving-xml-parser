import {
    LxNodeNature,
    LxNodeParser,
    LxNodeType,
    LxParseContext,
} from "../types";
import { parseAloneNode } from "./alone";
import { COMMENT_START, COMMENT_END } from "../var";
export const parseComment = (context: LxParseContext) => {
    parseAloneNode(
        context,
        LxNodeType.comment,
        LxNodeNature.alone,
        COMMENT_START,
        COMMENT_END
    );
};

export const CommentParser: LxNodeParser = {
    match: COMMENT_START,
    nodeNature: LxNodeNature.alone,
    parse: parseComment,
};
