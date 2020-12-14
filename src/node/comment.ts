import {
    LxNodeCloseType,
    LxNodeJSON,
    LxNodeNature,
    LxNodeAdapter,
    LxNodeType,
    LxParseContext,
} from "../types";
import { parseAloneNode } from "./alone";
import { COMMENT_START, COMMENT_END } from "../var";

export const CommentParser: LxNodeAdapter = {
    nodeType: LxNodeType.comment,
    nodeNature: LxNodeNature.alone,
    parseMatch: COMMENT_START,
    parse: (context: LxParseContext) => {
        parseAloneNode(context, COMMENT_START, COMMENT_END, CommentParser);
    },
    serializeMatch(currentNode: LxNodeJSON): boolean {
        return currentNode.type === LxNodeType.comment;
    },
    serialize(currentNode: LxNodeJSON): string {
        return `${COMMENT_START}${currentNode.content || ""}${
            !currentNode.closeType ||
            currentNode.closeType === LxNodeCloseType.fullClosed
                ? COMMENT_END
                : ""
        }`;
    },
};
