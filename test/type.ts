import {
    FxParseOptions,
    FxNodeType,
    FxNode,
    FxEventType,
    FxWrong,
    FxParseContext,
} from "../src/types";
export interface FxParseTestCase {
    desc: string;
    xml: string;
    options?: FxParseOptions;
    items: FxParseTestCaseItem[];
}
export enum FxParseTestCaseItemType {
    event = "event",
    step = "step",
    child = "child",
    sourceLocation = "sourceLocation",
}

export interface FxParseTestCaseItem {
    target: FxParseTestCaseItemType | FxNodeType | string;
    value?: any;
    items?: Array<undefined | FxParseTestCaseItem>;
}

export type FxEventItem = [FxEventType, FxParseContext, FxNode | FxWrong];
