export enum LxNodeType {
    comment = "comment",
    element = "element",
    text = "text",
    attr = "attr",
}
export enum LxParseAttrTarget {
    name = "name",
    equal = "equal",
    leftBoundary = "leftBoundary",
    content = "content",
}
export enum LxEventType {
    nodeStart,
    nodeEnd,
    error,
    warn,
}
export interface LxWrong extends LxMessage {
    fragment?: string;
    line: number;
    col: number;
    detail?: string;
    customIgnore?: any;
}
export interface LxMessage {
    code: number;
    message: string;
}
export interface LxParseArg {
    index: number;
    xmlLength: number;
    xml: string;
    nodes: LxNode[];
    line: number;
    col: number;
    maxLine: number;
    maxCol: number;
    currentNode?: LxNode;
    options?: LxParseOptions;
    warnings?: LxWrong[];
}
export interface LxErrorChecker {
    (err: LxWrong, arg: LxParseArg): boolean;
}
export interface LxEventHandler {
    (type: LxEventType, arg: LxParseArg, data: any);
}
export interface LxParseOptions {
    // 忽略标签名称附近的空格
    ignoreNearTagNameSpace?: boolean;
    // 忽略标签名称大小写对比
    ignoreTagNameCaseEqual?: boolean;
    // 当发生异常时均将异常信息传递到该函数，如果【结果===true】则抛出，否则均不抛出错误，并将结果连同原异常信息存入wranings
    checkError?: LxErrorChecker;
    onEvent?: LxEventHandler;
}
export interface LxToJSONOptions {
    maxLine?: boolean;
    maxCol?: boolean;
    xml?: boolean;
    locationInfo?: boolean;
}

export interface LxParseResult extends LxParseResultJSON {
    maxLine: number;
    maxCol: number;
    xml: string;
    nodes?: LxNode[];
}

export interface LxParseResultJSON {
    maxLine?: number;
    maxCol?: number;
    xml?: string;
    nodes?: LxNodeJSON[];
    error?: LxWrong;
    warnings?: LxWrong[];
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
