import {
    FxBoundaryPosition,
    FxCursorPosition,
    FxNodeAdapter,
    FxNodeType,
    FxTryStep,
    ignoreSpaceFindCharCursor,
} from "../../src";
import { FxParseOptionsTestCaseMap, FxParseTestCase } from "../type";
export const optionsCases: FxParseOptionsTestCaseMap = {
    allowStartTagBoundaryNearSpace: [
        {
            desc: "Selfcloseing node left boundary has space",
            xml: "< p />",
            options: {
                allowStartTagBoundaryNearSpace: false,
            },
            items: [
                {
                    target: "error.code",
                    value: 1,
                },
                {
                    target: "error.offset",
                    value: 1,
                },
            ],
        },
        {
            desc: "Selfcloseing node start tag right boundary has space",
            xml: "<p />",
            options: {
                allowStartTagBoundaryNearSpace: false,
            },
            items: [
                {
                    target: "error.code",
                    value: 1,
                },
                {
                    target: "error.offset",
                    value: 2,
                },
            ],
        },
        {
            desc: "Allow selfcloseing boundary has space but allow other node",
            xml: "<p /><span ><p>< ? pi ?>",
            options: {
                allowStartTagBoundaryNearSpace: (
                    xml: string,
                    cursor: FxCursorPosition,
                    parser: FxNodeAdapter,
                    tagName?: string,
                    spacePosition?: FxBoundaryPosition,
                    steps?: FxTryStep[]
                ): boolean => {
                    if (
                        spacePosition === FxBoundaryPosition.right &&
                        parser.nodeType === FxNodeType.element &&
                        ignoreSpaceFindCharCursor(xml, cursor, "/")
                    ) {
                        return true;
                    }
                },
            },
            items: [
                {
                    target: "error.code",
                    value: 1,
                },
                {
                    target: "error.offset",
                    value: 10,
                },
            ],
        },
        {
            desc: "Element start tag(not attrs) left boundary has space",
            xml: "< p></p>",
            options: {
                allowStartTagBoundaryNearSpace: false,
            },
            items: [
                {
                    target: "error.code",
                    value: 1,
                },
                {
                    target: "error.offset",
                    value: 1,
                },
            ],
        },
        {
            desc: "Element start tag(has attrs) left boundary has space",
            xml: "< p hidden></p>",
            options: {
                allowStartTagBoundaryNearSpace: false,
            },
            items: [
                {
                    target: "error.code",
                    value: 1,
                },
                {
                    target: "error.offset",
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
                    target: "error.code",
                    value: 1,
                },
                {
                    target: "error.offset",
                    value: 2,
                },
            ],
        },
        {
            desc: "Element start tag(has attrs) right boundary has space",
            xml: "<p hidden\n></p>",
            options: {
                allowStartTagBoundaryNearSpace: false,
            },
            items: [
                {
                    target: "error.code",
                    value: 1,
                },
                {
                    target: "error.offset",
                    value: 9,
                },
            ],
        },
    ],
};
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
