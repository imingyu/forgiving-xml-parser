import {
    LxNodeJSON,
    LxNodeNature,
    LxNodeParser,
    LxNodeType,
    LxParseContext,
} from "../types";
import { parseAloneNode } from "./alone";
import { COMMENT_START, COMMENT_END } from "../var";
export const parseComment = (context: LxParseContext) => {
    parseAloneNode(context, LxNodeType.comment, COMMENT_START, COMMENT_END);
};

export const CommentParser: LxNodeParser = {
    nodeNature: LxNodeNature.alone,
    parseMatch: COMMENT_START,
    parse: parseComment,
    serializeMatch(currentNode: LxNodeJSON): boolean {
        return currentNode.type === LxNodeType.comment;
    },
    serialize(currentNode: LxNodeJSON): string {
        return `${COMMENT_START}${currentNode.content || ""}${
            currentNode.notClose ? "" : COMMENT_END
        }`;
    },
};
