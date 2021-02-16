import { FxParseTestCase, FxParseTestCaseItem, FxTestCaseMap } from "./type";
import {
    FxNodeCloseType,
    FxNodeType,
    FxParseOptions,
    FxParseResult,
    parse,
    parseResultToJSON,
} from "../src/index";
import { assert } from "chai";
import * as _ from "lodash";

export const placeholder = "  <p /> \n <s>1</s>";

export const execPlaceholderParseCases = (options?: FxParseOptions | any) => {
    const res = parse(placeholder, options);
    assert.hasAnyKeys(res, ["xml", "maxCol", "nodes"]);
    assert.equal(res.xml, placeholder);
    assert.equal(res.maxCol, 9);
    assert.equal(res.maxLine, 2);
    assert.equal(res.nodes[0].type, FxNodeType.text);
    assert.equal(res.nodes[1].type, FxNodeType.element);
    assert.equal(res.nodes[1].name, "p");
    assert.equal(res.nodes[1].closeType, FxNodeCloseType.selfCloseing);
    assert.equal(res.nodes[1].locationInfo.endColumn, 7);
    assert.equal(res.nodes[1].locationInfo.startTag.endColumn, 7);
    assert.doesNotHaveAnyKeys(res.nodes[1].locationInfo, ["endTag"]);
    assert.equal(res.nodes[3].type, FxNodeType.element);
    assert.equal(res.nodes[3].children[0].content, "1");
    assert.hasAnyKeys(res.nodes[3].locationInfo, ["endTag"]);
};

export const execParseTestCase = (ptc: FxParseTestCase) => {
    it(ptc.desc, () => {
        const res = parse(ptc.xml, ptc.options);
        equalCaseItems(res, ptc.items);
    });
};
type CaseItem = [number, FxParseTestCaseItem];
export const createCaseItems = (items: CaseItem[]): Array<undefined | FxParseTestCaseItem> => {
    const arr = [];
    items.forEach((item) => {
        arr[item[0]] = item[1];
    });
    return arr;
};

export const arrToObject = (arr: string[]): { [prop: string]: number } => {
    const res: { [prop: string]: number } = {};
    arr.forEach((item) => {
        res[item] = 1;
    });
    return res;
};

export const equalCaseItems = (res: FxParseResult, items: FxParseTestCaseItem[]) => {
    items.forEach((item) => {
        if (item.target.startsWith("!")) {
            assert.equal(_.has(res, item.target.substr(1)), false);
        } else {
            assert.equal(_.has(res, item.target), true, `not found:${item.target}`);
        }
        if ("value" in item) {
            if (typeof item.value === "function") {
                assert.equal(item.value(res), true);
            } else {
                assert.equal(_.get(res, item.target), item.value);
            }
        }
    });
};

export const equalObject = (source: any, target: any) => {
    for (let prop in target) {
        assert.hasAnyKeys(source, [prop]);
        if (typeof target[prop] !== "object") {
            assert.equal(target[prop], source[prop]);
        } else {
            assert.isObject(source[prop]);
            equalObject(source[prop], target[prop]);
        }
    }
};

export const testCases = (cases: FxTestCaseMap | FxParseTestCase[], handler: Function) => {
    if (Array.isArray(cases)) {
        cases.forEach((ptc) => {
            it(ptc.desc, () => {
                const res = handler(ptc.xml, ptc.options);
                equalCaseItems(res, ptc.items);
            });
        });
    } else if (cases) {
        for (let prop in cases) {
            describe(prop, () => {
                testCases(cases[prop], handler);
            });
        }
    }
};
