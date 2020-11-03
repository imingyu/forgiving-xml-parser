export enum LxNodeType {
    // <!-- -->
    comment = "comment",
    // <span>
    element = "element",
    text = "text",
    attr = "attr",
    // <![CDATA[  ]]>
    cdata = "cdata",
    // <? ?>
    processingInstruction = "processingInstruction",
    // <!DOCTYPE >
    dtd = "dtd",
    // 自定义的
    custom = "custom",
}
export enum LxParseAttrTarget {
    name = "name",
    equal = "equal",
    leftBoundary = "leftBoundary",
    content = "content",
}
export enum LxEventType {
    nodeStart = "nodeStart",
    nodeEnd = "nodeEnd",
    nodeNameStart = "nodeNameStart",
    nodeNameEnd = "nodeNameEnd",
    startTagStart = "startTagStart",
    startTagEnd = "startTagEnd",
    endTagStart = "endTagStart",
    endTagEnd = "endTagEnd",
    attrsStart = "attrsStart",
    attrsEnd = "attrsEnd",
    attrEqual = "attrEqual",
    attrLeftBoundary = "attrLeftBoundary",
    attrRightBoundary = "attrRightBoundary",
    nodeContentStart = "nodeContentStart",
    nodeContentEnd = "nodeContentEnd",
    error = "error",
    warn = "warn",
}
export declare type LxPick<T, K extends keyof T> = {
    [P in K]: T[P];
};
export declare type LxExclude<T, U> = T extends U ? never : T;
export declare type LxOmit<T, K extends keyof any> = LxPick<
    T,
    LxExclude<keyof T, K>
>;
export interface LxWrong extends LxMessage, LxCursorPosition {
    fragment?: string;
    detail?: string;
    customIgnore?: any;
    stack?: string;
}
export interface LxMessage {
    code: number;
    message: string;
}
export interface LxParseContext extends LxCursorPosition {
    xmlLength: number;
    xml: string;
    nodes: LxNode[];
    maxLineNumber: number;
    maxColumn: number;
    currentNode?: LxNode;
    options?: LxParseOptions;
    warnings?: LxWrong[];
    // 是否终止本轮循环
    continueEach?: boolean;
    // 是否终止循环
    breakEach?: boolean;
}
export interface LxErrorChecker {
    (err: LxWrong, context: LxParseContext): boolean;
}
export interface LxEventHandler {
    (type: LxEventType, context: LxParseContext, data: LxNode | LxWrong);
}
export interface LxCursorPosition {
    lineNumber: number;
    column: number;
    offset: number;
}
export interface LxTryStep {
    step: LxEventType;
    cursor: LxCursorPosition;
    data?:
        | LxNode
        | string
        | LxWrong
        | LxNodeType
        | [LxNodeType, boolean]
        | [LxNodeType, LxNodeNature];
}
export enum AttrMoreEqualDisposal {
    throwError = "throwError",
    merge = "merge",
    newAttr = "newAttr",
}
export enum StartTagMoreLeftBoundaryCharDisposal {
    throwError = "throwError",
    ignore = "ignore",
    // 将字符追加到tagName
    accumulationToName = "accumulationToName",
    // 当做一个新的node处理
    newNode = "newNode",
    // 当做当前的子node处理
    childNode = "childNode",
}
export interface LxLoopHookHandler {
    (context: LxParseContext): number;
}
export interface LxOptionChecker {
    (cursor: LxCursorPosition): boolean;
}
export interface LxEqualNameChecker {
    (
        startTagNeme: string,
        endTagName: string,
        node: LxNode,
        context: LxParseContext
    ): boolean;
}
export interface LxOptionDisposal<T> {
    (node: LxNode, cursor: LxCursorPosition): T;
}
export interface LxParseOptions {
    // 是否允许开始标签的左边界符附近存在空白字符；正则会匹配节点名称，命中规则才生效；函数会将当前光标位置传入，返回true规则才生效
    allowStartTagLeftBoundarySpace?: boolean | RegExp | LxOptionChecker;
    // 忽略标签名称大小写对比；正则会匹配节点名称，命中规则才生效；函数会将当前节点传入，返回true规则才生效
    ignoreTagNameCaseEqual?: boolean | RegExp | LxEqualNameChecker;
    // 是否允许节点不关闭；正则会匹配节点名称，命中规则才生效；函数会将当前节点传入，返回true规则才生效
    allowNodeNotClose?: boolean | RegExp | LxOptionChecker;
    // 是否允许属性名为空；函数会将当前节点传入，返回true规则才生效
    allowAttrNameEmpty?: boolean | LxOptionChecker;
    // 是否允许属性值中存在换行，仅在属性表达式中包含边界符（“"”,“'”）时生效
    allowAttrContentHasBr?: boolean | LxOptionChecker;
    // 是否允许属性等号附近存在空白字符
    allowNearAttrEqualSpace?: boolean | LxOptionChecker;
    // 当遇到属性中含有多个“=”时怎么处置？
    encounterAttrMoreEqual?:
        | AttrMoreEqualDisposal
        | LxOptionDisposal<AttrMoreEqualDisposal>;
    // 当发生异常时均将异常信息传递到该函数，如果【结果===true】则抛出，否则均不抛出错误，并将结果连同原异常信息存入wranings
    checkError?: LxErrorChecker;
    // onEvent?: LxEventHandler;
    // 每次循环都会执行参函数，如果返回值=1则跳出本轮循环，如果=2则跳出循环
    loopHook?: LxLoopHookHandler;
    onEvent?: LxEventHandler;
    nodeParser?: LxNodeParser[];
}
export enum LxNodeNature {
    alone = "alone",
    children = "children",
}
export interface LxNodeParser {
    match: string | RegExp | LxNodeParserMatcher;
    nodeNature: LxNodeNature;
    parse(context: LxParseContext);
}
export interface LxNodeParserMatcher {
    (xml: string, cursor: LxCursorPosition): boolean;
}
export type LxParseOptionsKeys = keyof LxParseOptions;
export interface LxToJSONOptions {
    maxLine?: boolean;
    maxCol?: boolean;
    xml?: boolean;
    locationInfo?: boolean;
    steps?: boolean;
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

export interface LxBoundStepsLoopCallback {
    (stepItem: LxTryStep, stepItemIndex: number): boolean;
}

export interface LxNodeLocationInfo extends LxLocation {
    startTag?: LxLocation;
    endTag?: LxLocation;
    attrs?: LxLocation[];
}
export interface LxNodeJSON {
    type: LxNodeType;
    name?: string;
    content?: string;
    children?: LxNodeJSON[];
    attrs?: LxNodeJSON[];
    selfcloseing?: boolean;
    notClose?: boolean;
    locationInfo?: LxNodeLocationInfo;
    boundaryChar?: string;
    equalCount?: number;
    nature?: LxNodeNature;
}
export interface LxNode extends LxNodeJSON {
    children?: LxNode[];
    attrs?: LxNode[];
    parent?: LxNode;
    steps?: LxTryStep[];
}
export interface LxLocation {
    startLineNumber: number;
    endLineNumber?: number;
    startColumn: number;
    endColumn?: number;
    startOffset: number;
    endOffset?: number;
}

export interface LxElementEndTagInfo {
    content: string;
    name: string;
    boundaryHasSpace?: boolean;
    locationInfo: LxLocation;
    wrongList?: LxWrong[];
    closed: boolean;
    parentIndex: number;
}
