import {
    FxNodeCloseType,
    FxNodeJSON,
    FxNodeNature,
    FxNodeAdapter,
    FxNodeType,
    FxParseContext,
} from "../types";
import { parseAloneNode } from "./alone";
import { COMMENT_START, COMMENT_END } from "../var";

export const CommentParser: FxNodeAdapter = {
    nodeType: FxNodeType.comment,
    nodeNature: FxNodeNature.alone,
    parseMatch: COMMENT_START,
    parse: (context: FxParseContext) => {
        parseAloneNode(context, COMMENT_START, COMMENT_END, CommentParser);
    },
    serializeMatch(currentNode: FxNodeJSON): boolean {
        return currentNode.type === FxNodeType.comment;
    },
    serialize(currentNode: FxNodeJSON): string {
        return `${COMMENT_START}${currentNode.content || ""}${
            !currentNode.closeType ||
            currentNode.closeType === FxNodeCloseType.fullClosed
                ? COMMENT_END
                : ""
        }`;
    },
};
