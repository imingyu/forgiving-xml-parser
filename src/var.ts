import { AttrMoreEqualDisposal, FxParseOptions } from "./types";

export const CDATA_START = "<![CDATA[";
export const CDATA_END = "]]>";
export const COMMENT_START = "<!--";
export const COMMENT_END = "-->";
export const DTD_START = "<!";
export const DTD_END = "]>";
export const REX_SPACE = /\s/;
export const DEFAULT_PARSE_OPTIONS: FxParseOptions = {
    allowAttrContentHasBr: true,
    allowNodeNameEmpty: true,
    allowNodeNotClose: true,
    allowStartTagBoundaryNearSpace: true,
    allowEndTagBoundaryNearSpace: true,
    allowTagNameHasSpace: true,
    allowNearAttrEqualSpace: true,
    ignoreTagNameCaseEqual: true,
    encounterAttrMoreEqual: AttrMoreEqualDisposal.merge,
};
