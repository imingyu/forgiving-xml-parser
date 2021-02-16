import { FxParseTestCase } from "../type";
import { FxNodeType } from "../../src";

export const coreCases: FxParseTestCase[] = [
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
