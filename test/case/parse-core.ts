import { FxParseTestCase } from "../type";
import { FxNodeType } from "../../src";

const createCommonCases = (nodeType: FxNodeType): FxParseTestCase[] => {
    const res: FxParseTestCase[] = [];
    // Node not close
    // Node start tag not close
    // Node end tag not close
    // {
    //     const caseItem: FxParseTestCase = {
    //         desc: "Node not close (1)",
    //         xml: "",
    //         items: [],
    //     };
    //     if (nodeType === FxNodeType.element) {
    //         caseItem.xml = " <p";
    //     }
    //     res.push(caseItem);
    // }
    return res;
};

export const Element: FxParseTestCase[] = [
    ...createCommonCases(FxNodeType.element),
    {
        desc: "Start tag not close (attr only name)",
        xml: "<p hidden ",
        items: [
            {
                target: "!error",
            },
            {
                target: "nodes[0].name",
                value: "p",
            },
            {
                target: "nodes[0].attrs.length",
                value: 1,
            },
            {
                target: "nodes[0].attrs[0].name",
                value: "hidden",
            },
            {
                target: "!nodes[0].attrs[0].content",
            },
        ],
    },
    {
        desc: "Start tag not close (attr only content)",
        xml: '<p "s" ',
        items: [
            {
                target: "!error",
            },
            {
                target: "nodes[0].name",
                value: "p",
            },
            {
                target: "nodes[0].attrs.length",
                value: 1,
            },
            {
                target: "nodes[0].attrs[0].content",
                value: "s",
            },
            {
                target: "!nodes[0].attrs[0].name",
            },
        ],
    },
    {
        desc: "Start tag not close (attr content not close)",
        xml: '<p "s ',
        items: [
            {
                target: "!error",
            },
            {
                target: "nodes[0].name",
                value: "p",
            },
            {
                target: "nodes[0].attrs.length",
                value: 1,
            },
            {
                target: "nodes[0].attrs[0].content",
                value: "s",
            },
            {
                target: "!nodes[0].attrs[0].name",
            },
        ],
    },
    {
        desc: "Start tag not close (attr close)",
        xml: '<p "s" name="a" checked',
        items: [
            {
                target: "!error",
            },
            {
                target: "nodes[0].name",
                value: "p",
            },
            {
                target: "nodes[0].attrs.length",
                value: 3,
            },
            {
                target: "nodes[0].attrs[0].content",
                value: "s",
            },
            {
                target: "!nodes[0].attrs[0].name",
            },
            {
                target: "nodes[0].attrs[1].content",
                value: "a",
            },
        ],
    },
];
export const Comment: FxParseTestCase[] = [...createCommonCases(FxNodeType.comment)];
export const CDATA: FxParseTestCase[] = [...createCommonCases(FxNodeType.cdata)];
export const DTD: FxParseTestCase[] = [...createCommonCases(FxNodeType.dtd)];
export const ProcessingInstruction: FxParseTestCase[] = [
    ...createCommonCases(FxNodeType.processingInstruction),
];

export const Common: FxParseTestCase[] = [
    {
        desc: "t1",
        xml: "<p>123</p>",
        items: [
            {
                target: "maxCol",
                value: 10,
            },
            {
                target: "nodes[0].children[0].content",
                value: "123",
            },
            {
                target: "nodes[0].children[0].type",
                value: FxNodeType.text,
            },
        ],
    },
];
