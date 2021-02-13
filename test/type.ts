import {
    FxParseOptions,
    FxNode,
    FxEventType,
    FxWrong,
    FxParseContext,
    FxParseResult,
} from "../src/types";
export interface FxParseTestCase {
    desc: string;
    xml: string;
    options?: FxParseOptions;
    items: FxParseTestCaseItem[];
}
export type FxParseOptionsTestCaseMap = {
    [prop in keyof FxParseOptions]?: FxParseTestCase[];
};
export interface FxParseTestCaseItem {
    target: string;
    value?: FxParseTestCaseEqualer | any;
}

export interface FxParseTestCaseEqualer {
    (res: FxParseResult): boolean;
}

export type FxEventItem = [FxEventType, FxParseContext, FxNode | FxWrong];
