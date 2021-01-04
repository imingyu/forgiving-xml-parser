import { FxNodeType } from "../../src";
import { FxParseTestCase, FxParseTestCaseItemType } from "../type";
export const optionsCases: FxParseTestCase[] = [
    {
        desc: "Selfcloseing node left boundary has space",
        xml: "< p />",
        options: {
            allowStartTagBoundaryNearSpace: false,
        },
        items: [
            {
                target: "error",
                value: 1,
            },
        ],
    },
    {
        desc: "Element start tag left boundary has space",
        xml: "< p></p>",
        options: {
            allowStartTagBoundaryNearSpace: false,
        },
        items: [
            {
                target: "error",
                value: 1,
            },
        ],
    },
    {
        desc: "Element start tag(not attrs) right boundary has space",
        xml: "<p\n></p>",
        options: {
            allowStartTagBoundaryNearSpace: false,
        },
        items: [
            {
                target: "error",
                value: 1,
            },
        ],
    },
];
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
