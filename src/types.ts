export enum FxNodeType {
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
export enum FxParseAttrTarget {
    name = "name",
    equal = "equal",
    leftBoundary = "leftBoundary",
    content = "content",
}
export enum FxEventType {
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
export declare type FxPick<T, K extends keyof T> = {
    [P in K]: T[P];
};
export declare type FxExclude<T, U> = T extends U ? never : T;
export declare type FxOmit<T, K extends keyof any> = FxPick<T, FxExclude<keyof T, K>>;
export interface FxWrong extends FxMessage, FxCursorPosition {
    fragment?: string;
    detail?: string;
    customIgnore?: any;
    stack?: string;
}
export interface FxMessage {
    code: number;
    message: string;
}

export interface FxNodeSerializeHandler {
    (
        currentNode: FxNodeJSON,
        siblingNodes: FxNodeJSON[],
        rootNodes: FxNodeJSON[],
        rootSerializer: FxNodeSerializer,
        parentNode: FxNodeJSON,
        adapter: FxNodeAdapter,
        serializeResult: string
    ): string;
}
export interface FxSerializeBaseOptions {}
export interface FxSerializeOptions extends FxSerializeBaseOptions {
    nodeAdapters?: FxNodeAdapter[];
    nodeSerializeHandler?: FxNodeSerializeHandler;
}
export interface FxParseContext extends FxCursorPosition {
    xmlLength: number;
    xml: string;
    nodes: FxNode[];
    maxLineNumber: number;
    maxColumn: number;
    currentNode?: FxNode;
    options?: FxParseOptions;
    // 是否终止本轮循环
    continueEach?: boolean;
    // 是否终止循环
    breakEach?: boolean;
}
export interface FxErrorChecker {
    (err: FxWrong, context: FxParseContext): boolean;
}
export interface FxEventHandler {
    (type: FxEventType, context: FxParseContext, data: FxNode | FxWrong);
}
export interface FxCursorPosition {
    lineNumber: number;
    column: number;
    offset: number;
}
export type FxTryStepData =
    | FxNode
    | string
    | FxWrong
    | FxNodeType
    | FxNodeAdapter
    | [FxNodeAdapter, FxNodeCloseType]
    | [FxNodeType, FxNodeCloseType, string?];
export interface FxTryStep {
    step: FxEventType;
    cursor: FxCursorPosition;
    data?: FxTryStepData;
}
export interface FxNodeTryStep extends FxTryStep {
    target: FxNode;
}
export enum FxAttrMoreEqualDisposal {
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
export interface FxLoopHookHandler {
    (context: FxParseContext): number;
}
export interface FxOptionChecker {
    (xml: string, cursor: FxCursorPosition, parser: FxNodeAdapter): boolean;
}
export interface FxEqualNameChecker {
    (endTagName: string, nodeAnterior: FxNode, context: FxParseContext): boolean;
}
export interface FxOptionDisposal<T> {
    (xml: string, cursor: FxCursorPosition, parser: FxNodeAdapter): T;
}
export enum FxTagType {
    startTag = "startTag",
    endTag = "endTag",
}
export interface FxAllowNearTagBoundarySpace {
    (xml: string, cursor: FxCursorPosition, parser: FxNodeAdapter, tagName?: string): boolean;
}
export interface FxAllowTagNameHasSpace {
    (xml: string, cursor: FxCursorPosition, tagName: string, tagType: FxTagType): boolean;
}
export interface FxParseBaseOptions {
    // 是否允许开始标签的左边界符附近存在空白字符；正则会匹配节点名称，命中规则才生效；函数会将当前光标位置传入，返回true规则才生效
    allowStartTagBoundaryNearSpace?: boolean | RegExp | FxAllowNearTagBoundarySpace;
    allowEndTagBoundaryNearSpace?: boolean | RegExp | FxAllowNearTagBoundarySpace;
    allowTagNameHasSpace?: boolean | RegExp | FxAllowTagNameHasSpace;
    // 忽略标签名称大小写对比；正则会匹配节点名称，命中规则才生效；函数会将当前节点传入，返回true规则才生效
    ignoreTagNameCaseEqual?: boolean | RegExp | FxEqualNameChecker;
    // 是否允许节点名称为空；
    allowNodeNameEmpty?: boolean | FxOptionChecker;
    // 是否允许节点不关闭；正则会匹配节点名称，命中规则才生效；函数会将当前节点传入，返回true规则才生效
    allowNodeNotClose?: boolean | RegExp | FxAllowNodeNotCloseChecker;
    // 是否允许属性值中存在换行，仅在属性表达式中包含边界符（“"”,“'”）时生效
    allowAttrContentHasBr?: boolean | FxOptionChecker;
    // 是否允许属性等号附近存在空白字符
    allowNearAttrEqualSpace?: boolean | FxOptionChecker;
    // 当遇到属性中含有多个“=”时怎么处置？
    encounterAttrMoreEqual?: FxAttrMoreEqualDisposal | FxOptionDisposal<FxAttrMoreEqualDisposal>;
}
export interface FxParseOptions extends FxParseBaseOptions {
    onEvent?: FxEventHandler;
    nodeAdapters?: FxNodeAdapter[];
}

export enum FxNodeNature {
    alone = "alone",
    children = "children",
}

export interface FxAttrParseCallback {
    (attrSteps: FxTryStep[], readyAttrsSteps: FxTryStep[]): boolean;
}
export interface FxNodeSerializeMatcher {
    (
        currentNode: FxNodeJSON,
        siblingNodes: FxNodeJSON[],
        rootNodes: FxNodeJSON[],
        options: FxSerializeOptions,
        parentNode?: FxNodeJSON
    ): boolean;
}
export interface FxNodeSerializer {
    (nodes: FxNodeJSON[], options: FxSerializeOptions, parentNode?: FxNodeJSON): string;
}

export enum FxNodeParserAllowNodeNotCloseOption {
    allow = "allow",
    notAllow = "notAllow",
    followParserOptions = "followParserOptions",
}
export interface FxAllowNodeNotCloseChecker {
    (onlyAnteriorNode: FxNode, context: FxParseContext, parser: FxNodeAdapter): boolean;
}
export interface FxNodeAdapter {
    nodeType: FxNodeType;
    nodeNature: FxNodeNature;
    nodeCustomType?: string;
    attrLeftBoundaryChar?: string | RegExp;
    attrRightBoundaryChar?: string | RegExp;
    attrBoundaryCharNeedEqual?: boolean;
    allowNodeNotClose?: FxNodeParserAllowNodeNotCloseOption | FxAllowNodeNotCloseChecker;
    parseMatch: string | RegExp | FxNodeParserMatcher;
    parse(context: FxParseContext, parentNodeParser?: FxNodeAdapter);
    checkAttrsEnd?(
        xml: string,
        cursor: FxCursorPosition,
        options: FxSerializeOptions
    ): FxCursorPosition;
    serializeMatch: FxNodeSerializeMatcher;
    serialize(
        currentNode: FxNodeJSON,
        siblingNodes: FxNodeJSON[],
        rootNodes: FxNodeJSON[],
        rootSerializer: FxNodeSerializer,
        options: FxSerializeOptions,
        parentNode: FxNodeJSON
    ): string;
}
export interface FxNodeParserMatcher {
    (xml: string, cursor: FxCursorPosition, options: FxParseOptions): boolean;
}
export type FxParseOptionsKeys = keyof FxParseOptions;
export interface FxToJSONDataFilter {
    (
        source: FxWrong | FxNode | FxLocation | FxTryStep,
        result: FxTryStep | FxWrong | FxNodeJSON | FxLocation
    ): FxWrong | FxNodeJSON | FxLocation | FxTryStep;
}
export interface FxToJSONOptions {
    maxLine?: boolean;
    maxCol?: boolean;
    xml?: boolean;
    locationInfo?: boolean;
    steps?: boolean;
    dataFilter?: FxToJSONDataFilter;
}
export interface FxParseResultJSON {
    maxLine?: number;
    maxCol?: number;
    xml?: string;
    nodes?: FxNodeJSON[];
    error?: FxWrong;
}
export interface FxParseResult extends FxParseResultJSON {
    maxLine: number;
    maxCol: number;
    xml: string;
    nodes?: FxNode[];
}
export interface FxBoundStepsLoopCallback {
    (stepItem: FxTryStep, stepItemIndex: number): boolean;
}
export interface FxNodeTagLocationInfo extends FxLocation {
    name?: FxLocation; // startTag|endTag部分中名称的位置信息
}

export interface FxNodeLocationInfo extends FxLocation {
    name?: FxLocation; // 名称的位置信息
    content?: FxLocation; // 内容的位置信息
    leftBoundary?: FxCursorPosition; // 左边界符的位置信息
    rightBoundary?: FxCursorPosition; // 右边界符的位置信息
    startTag?: FxNodeTagLocationInfo; // startTag部分的代码位置信息
    endTag?: FxNodeTagLocationInfo; // endTag部分的代码位置信息
    attrs?: FxNodeLocationInfo[]; // 属性部分的代码位置信息，数组顺序为每个属性出现的顺序
}
export enum FxNodeCloseType {
    notClosed = "notClosed",
    fullClosed = "fullClosed",
    selfCloseing = "selfCloseing",
    startTagClosed = "startTagClosed",
}
export interface FxNodeJSON {
    type: FxNodeType;
    customType?: string;
    closeType?: FxNodeCloseType;
    name?: string;
    content?: string;
    children?: FxNodeJSON[];
    attrs?: FxNodeJSON[];
    locationInfo?: FxNodeLocationInfo;
    boundaryChar?: string[];
    equalCount?: number;
    nature?: FxNodeNature;
    steps?: FxTryStep[];
}
export interface FxNode extends FxNodeJSON {
    parser: FxNodeAdapter;
    locationInfo: FxNodeLocationInfo;
    children?: FxNode[];
    attrs?: FxNode[];
    parent?: FxNode;
    steps?: FxNodeTryStep[];
}
export interface FxLocation {
    startLineNumber: number;
    endLineNumber?: number;
    startColumn: number;
    endColumn?: number;
    startOffset: number;
    endOffset?: number;
}

export interface FxStartTagCompare {
    (targetNode: FxNode, context: FxParseContext, endTagSteps: FxTryStep[]): boolean;
}

export interface FxParserOptions {
    nodeAdapters?: FxNodeAdapter[];
    parseOptions?: FxParseBaseOptions;
    serializeOptions?: FxSerializeBaseOptions;
}
