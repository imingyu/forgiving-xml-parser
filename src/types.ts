export enum LxNodeType {
    comment = "comment",
    element = "element",
    text = "text",
    attr = "attr",
}

export interface LxError extends Error {
    lxLine: number;
    lxCol: number;
    toJSON(): LxParseError;
}

export interface LxParseArg {
    index: number;
    xmlLength: number;
    xml: string;
    xmlRows: string[];
    nodes: LxNode[];
    line: number;
    col: number;
    maxLine: number;
    maxCol: number;
    currentNode?: LxNode;
    options?: LxParseOptions;
}
export interface LxParseOptions {
    // 忽略标签名称附近的空格
    ignoreNearTagNameSpace?: boolean;
    // 忽略标签名称大小写对比
    ignoreTagNameCaseEqual?: boolean;
}
export interface LxToJSONOptions {
    maxLine?: boolean;
    maxCol?: boolean;
    xml?: boolean;
    xmlRows?: boolean;
    locationInfo?: boolean;
}

export interface LxParseError {
    message: string;
    line: number;
    col: number;
}

export interface LxParseResult extends LxParseResultJSON {
    maxLine: number;
    maxCol: number;
    xml: string;
    xmlRows: string[];
    nodes?: LxNode[];
}

export interface LxParseResultJSON {
    maxLine?: number;
    maxCol?: number;
    xml?: string;
    xmlRows?: string[];
    nodes?: LxNodeJSON[];
    error?: LxParseError;
}

export interface LxNodeLocationInfo extends LxLocation {
    startTag?: LxLocation;
    endTag?: LxLocation;
    attrs?: {
        [prop: string]: LxLocation;
    };
}
export interface LxNodeJSON {
    type: LxNodeType;
    name?: string;
    content?: string;
    children?: LxNodeJSON[];
    attrs?: LxNodeJSON[];
    selfcloseing?: boolean;
    locationInfo?: LxNodeLocationInfo;
    hasQuotationMarks?: boolean;
}
export interface LxNode extends LxNodeJSON {
    children?: LxNode[];
    attrs?: LxNode[];
    parent?: LxNode;
}
export interface LxLocation {
    startLine: number;
    endLine?: number;
    startCol: number;
    endCol?: number;
    startOffset: number;
    endOffset?: number;
}
