import {
    FxBoundaryPosition,
    FxCursorPosition,
    FxNodeAdapter,
    FxNodeType,
    FxTryStep,
    ignoreSpaceFindCharCursor,
} from "../../src";
import { FxParseOptionsTestCaseMap, FxParseTestCase, FxTestCaseMap } from "../type";
const createOptionCommonCases = (
    optionName: string,
    optionVal: any,
    remark?: string
): FxParseTestCase[] => {
    const res = [
        {
            desc: "Comment node",
            xml: "<!-- 11-->",
            options: {
                [optionName]: optionVal,
            },
            items: [
                {
                    target: "!error",
                },
                {
                    target: "nodes[0].type",
                    value: FxNodeType.comment,
                },
                {
                    target: "nodes[0].content",
                    value: " 11",
                },
            ],
        },
        {
            desc: "CDATA node",
            xml: "<![CDATA[ 11]]>",
            options: {
                [optionName]: optionVal,
            },
            items: [
                {
                    target: "!error",
                },
                {
                    target: "nodes[0].type",
                    value: FxNodeType.cdata,
                },
                {
                    target: "nodes[0].content",
                    value: " 11",
                },
            ],
        },
        {
            desc: "DTD node not child",
            xml: "<!ELEMENT br EMPTY>",
            options: {
                [optionName]: optionVal,
            },
            items: [
                {
                    target: "!error",
                },
                {
                    target: "nodes[0].type",
                    value: FxNodeType.dtd,
                },
                {
                    target: "nodes[0].attrs[0].name",
                    value: "br",
                },
            ],
        },
        {
            desc: "DTD node has child",
            xml: " <!DOCTYPE note [\n<!ELEMENT note (to,from,heading,body)>\n]>",
            options: {
                [optionName]: optionVal,
            },
            items: [
                {
                    target: "!error",
                },
                {
                    target: "nodes[1].type",
                    value: FxNodeType.dtd,
                },
                {
                    target: "nodes[1].name",
                    value: "DOCTYPE",
                },
                {
                    target: "nodes[1].attrs[0].name",
                    value: "note",
                },
                {
                    target: "nodes[1].children[1].name",
                    value: "ELEMENT",
                },
                {
                    target: "nodes[1].children[1].attrs[1].content",
                    value: "to,from,heading,body",
                },
            ],
        },
        {
            desc: "ProcessingInstruction node",
            xml: '<?xml version="1.0"?>',
            options: {
                [optionName]: optionVal,
            },
            items: [
                {
                    target: "!error",
                },
                {
                    target: "nodes[0].type",
                    value: FxNodeType.processingInstruction,
                },
                {
                    target: "nodes[0].attrs[0].name",
                    value: "version",
                },
            ],
        },
    ];
    res.forEach((item) => {
        item.desc = `Common case:${item.desc}`;
        if (remark) {
            item.desc += ` (${remark})`;
        }
    });
    return res;
};
export const allowStartTagBoundaryNearSpace: FxTestCaseMap = {
    "value=true": [...createOptionCommonCases("allowStartTagBoundaryNearSpace", true)],
    "value=false": [
        ...createOptionCommonCases("allowStartTagBoundaryNearSpace", false),
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
        {
            desc: "Child start tag left boundary has space",
            xml: "<p>< span></p>",
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
                    value: 4,
                },
            ],
        },
        {
            desc: "Child start tag right boundary has space",
            xml: "<p><span >",
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
                    value: 8,
                },
            ],
        },
    ],
    "value=FxBoundaryPosition.left": [
        ...createOptionCommonCases("allowStartTagBoundaryNearSpace", FxBoundaryPosition.left),
        {
            desc: "Node left boundary has space but node name is empty",
            xml: "<p>< name='1' hidden/>",
            options: {
                allowStartTagBoundaryNearSpace: FxBoundaryPosition.left,
            },
            items: [
                {
                    target: "!error",
                },
                {
                    target: "!nodes[0].children[0].name",
                },
                {
                    target: "nodes[0].children[0].attrs[0].name",
                    value: "name",
                },
                {
                    target: "nodes[0].children[0].attrs[0].content",
                    value: "1",
                },
                {
                    target: "nodes[0].children[0].attrs[0].locationInfo.startOffset",
                    value: 5,
                },
                {
                    target: "nodes[0].children[0].attrs[1].name",
                    value: "hidden",
                },
                {
                    target: "nodes[0].children[0].attrs[1].locationInfo.startOffset",
                    value: 14,
                },
            ],
        },
        {
            desc: "Selfcloseing node left boundary has space",
            xml: "<span>< p/>",
            options: {
                allowStartTagBoundaryNearSpace: FxBoundaryPosition.left,
            },
            items: [
                {
                    target: "!error",
                },
                {
                    target: "nodes[0].children[0].name",
                    value: "p",
                },
                {
                    target: "nodes[0].children[0].locationInfo.startTag.name.startOffset",
                    value: 8,
                },
            ],
        },
        {
            desc: "Selfcloseing node start tag right boundary has space",
            xml: " <p /><span>",
            options: {
                allowStartTagBoundaryNearSpace: FxBoundaryPosition.left,
            },
            items: [
                {
                    target: "error.code",
                    value: 1,
                },
                {
                    target: "error.offset",
                    value: 3,
                },
            ],
        },
        {
            desc: "Element start tag left boundary has space",
            xml: "< p><span>23</span></p>",
            options: {
                allowStartTagBoundaryNearSpace: FxBoundaryPosition.left,
            },
            items: [
                {
                    target: "!error",
                },
                {
                    target: "nodes[0].name",
                    value: "p",
                },
                {
                    target: "nodes[0].locationInfo.startTag.name.startOffset",
                    value: 2,
                },
            ],
        },
    ],
    "value=FxBoundaryPosition.right": [
        ...createOptionCommonCases("allowStartTagBoundaryNearSpace", FxBoundaryPosition.right),
    ],
    "value=RegExp": [...createOptionCommonCases("allowStartTagBoundaryNearSpace", /p/)],
    "value=Function": [
        ...createOptionCommonCases(
            "allowStartTagBoundaryNearSpace",
            () => true,
            "func return true"
        ),
        ...createOptionCommonCases(
            "allowStartTagBoundaryNearSpace",
            () => false,
            "func return true"
        ),
        ...createOptionCommonCases(
            "allowStartTagBoundaryNearSpace",
            () => FxBoundaryPosition.left,
            "func return left"
        ),
        ...createOptionCommonCases(
            "allowStartTagBoundaryNearSpace",
            () => FxBoundaryPosition.right,
            "func return right"
        ),

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
    ],
};
