import { FxNodeType } from "../src";
import { FxParseTestCase, FxParseTestCaseItemType } from "./type";
const cases: FxParseTestCase[] = [
    {
        desc: "t1",
        xml: "<p>123</p>",
        items: [
            {
                target: "maxCol",
                value: 10,
            },
            {
                target: FxParseTestCaseItemType.child,
                items: [
                    {
                        target: FxNodeType.element,
                        items: [
                            {
                                target: FxParseTestCaseItemType.child,
                                items: [
                                    {
                                        target: FxNodeType.text,
                                        items: [
                                            {
                                                target: "content",
                                                value: "123",
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
];
export default cases;
