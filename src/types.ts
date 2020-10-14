export enum LxNodeType {
    comment = "comment",
    element = "element",
    text = "text",
    attr = "attr",
    cdata = "cdata",
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
    nodeNameStart,
    nodeNameEnd,
    startTagStart,
    startTagEnd,
    endTagStart,
    endTagEnd,
    attrsStart,
    attrNameStart,
    attrEqualStart,
    attrEqualEnd,
    attrLeftBoundaryStart,
    attrLeftBoundaryEnd,
    attrRightBoundaryStart,
    attrRightBoundaryEnd,
    nodeContentStart,
    nodeContentEnd,
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
export interface LxEacher {
    (arg: LxParseArg, continueFire?: Function, breakFire?: Function);
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
    // 是否终止本轮循环
    continueEach?: boolean;
    // 是否终止循环
    breakEach?: boolean;
}
export interface LxErrorChecker {
    (err: LxWrong, arg: LxParseArg): boolean;
}
export interface LxEventHandler {
    (type: LxEventType, arg: LxParseArg, data: any);
}
export enum AttrMoreEqualDisposal {
    throwError = "throwError",
    merge = "merge",
    newAttr = "newAttr",
}
export interface LxParseOptions {
    // 是否允许标签名称附近存在空白字符
    allowNearTagNameSpace?: boolean;
    // 忽略标签名称大小写对比
    ignoreTagNameCaseEqual?: boolean;
    // 是否允许标签不关闭
    allowTagNotClose?: boolean;
    // 是否允许属性名为空
    allowAttrNameEmpty?: boolean;
    // 是否允许属性值中存在换行，仅在属性表达式中包含边界符（“"”,“'”）时生效
    allowAttrContentHasBr?: boolean;
    // 是否允许属性等号附近存在空白字符
    allowNearAttrEqualSpace?: boolean;
    // 当遇到属性中含有多个“=”时怎么处置？
    encounterAttrMoreEqual?: AttrMoreEqualDisposal;
    // 当发生异常时均将异常信息传递到该函数，如果【结果===true】则抛出，否则均不抛出错误，并将结果连同原异常信息存入wranings
    checkError?: LxErrorChecker;
    onEvent?: LxEventHandler;
}
export type LxParseOptionsKeys = keyof LxParseOptions;
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
    boundaryChar?: string;
    equalCount?: number;
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
