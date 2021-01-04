import { FxEventItem, FxParseTestCase, FxParseTestCaseItem, FxParseTestCaseItemType } from "./type";
import {
    FxNode,
    FxNodeLocationInfo,
    FxNodeTagLocationInfo,
    FxNodeType,
    FxParseResult,
    parse,
} from "../src/index";
import { assert } from "chai";

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

export const equalCaseItems = (
    res: FxParseResult | FxNode | FxNode[],
    items: Array<undefined | FxParseTestCaseItem> | FxParseTestCaseItem
) => {
    if (!Array.isArray(items)) {
        if (!items) {
            return;
        }
        const node = res as FxNode;
        const ptc = items as FxParseTestCaseItem;
        if (ptc.target in FxNodeType) {
            assert.hasAnyKeys(node, ["type"]);
            assert.equal(node.type, ptc.target);
        } else if (ptc.target === FxParseTestCaseItemType.child) {
            if ("nodes" in res) {
                assert.hasAnyKeys(res, ["xml", "maxCol"]);
                equalCaseItems(res.nodes, ptc.items);
            } else {
                assert.hasAnyKeys(node, ["type", "children"]);
                assert.equal(node.children.length > 0, true);
                equalCaseItems(node.children, ptc.items);
            }
        } else if (
            ptc.target === FxParseTestCaseItemType.event ||
            ptc.target === FxParseTestCaseItemType.step
        ) {
            assert.hasAnyKeys(node, ["steps"]);
            if ("value" in ptc) {
                const targetSteps = arrToObject(node.steps.map((item) => item.step));
                assert.hasAnyKeys(targetSteps, Array.isArray(ptc.value) ? ptc.value : [ptc.value]);
            }
        } else if (ptc.target === FxParseTestCaseItemType.sourceLocation) {
            assert.hasAnyKeys(node, ["locationInfo"]);
            const loc = ptc.value as FxNodeLocationInfo | FxNodeTagLocationInfo;
        } else if (ptc.target) {
            assert.hasAnyKeys(res, [ptc.target]);
            if ("value" in ptc) {
                assert.equal(ptc.value, res[ptc.target]);
            }
        }
        return;
    }
    if (Array.isArray(res)) {
        return (res as FxNode[]).forEach((node, index) => {
            if (items[index]) {
                equalCaseItems(node, items[index]);
            }
        });
    }
    items.forEach((item) => {
        if (!item) {
            return;
        }
        equalCaseItems(res, item);
    });
};
