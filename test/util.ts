import {
    FxEventItem,
    FxParseTestCase,
    FxParseTestCaseItem,
    FxParseTestCaseItems,
    FxParseTestCaseItemType,
} from "./type";
import {
    FxNode,
    FxNodeCloseType,
    FxNodeLocationInfo,
    FxNodeTagLocationInfo,
    FxNodeType,
    FxParseOptions,
    FxParseResult,
    FxWrong,
    parse,
} from "../src/index";
import { assert } from "chai";

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

export const equalCaseItems = (
    res: FxParseResult | FxNode | FxNode[],
    items: FxParseTestCaseItems | FxParseTestCaseItem
) => {
    if (!Array.isArray(items) && "target" in items) {
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
                const err = res[ptc.target] as FxWrong;
                if (ptc.target === "error") {
                    const type = typeof ptc.value;
                    if (type === "number") {
                        assert.equal(ptc.value, err.code);
                    } else if (type === "object") {
                        equalObject(err, ptc.value);
                    } else {
                        assert.include(err.message, ptc.value);
                    }
                } else {
                    assert.equal(ptc.value, res[ptc.target]);
                }
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
