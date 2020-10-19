import { LxNodeType } from "./types";

export const CDATA_START = "<![CDATA[";
export const CDATA_END = "]]>";
export const COMMENT_START = "<!--";
export const COMMENT_END = "-->";
export const PI_START = "<?";
export const PI_END = "?>";
export const DTD_START = "<!";
export const DTD_END = ">";
export const ELEMENT_END = "</";
export const REX_SPACE = /\s/;
export const ALONE_NODE_MAP = {
    [LxNodeType.cdata]: CDATA_END,
    [LxNodeType.comment]: COMMENT_END,
};