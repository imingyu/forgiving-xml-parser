import {
    FxBoundaryPosition,
    FxCursorPosition,
    FxNodeAdapter,
    FxNodeType,
    FxTryStep,
    ignoreSpaceFindCharCursor,
} from "../../src";
import { FxParseTestCase, FxTestCaseMap } from "../type";
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
        {
            desc: "Element node",
            xml: "<p>1</p>",
            options: {
                [optionName]: optionVal,
            },
            items: [
                {
                    target: "!error",
                },
                {
                    target: "nodes[0].type",
                    value: FxNodeType.element,
                },
                {
                    target: "nodes[0].children[0].content",
                    value: "1",
                },
            ],
        },
        {
            desc: "Selfcloseing node",
            xml: "<p/>",
            options: {
                [optionName]: optionVal,
            },
            items: [
                {
                    target: "!error",
                },
                {
                    target: "nodes[0].type",
                    value: FxNodeType.element,
                },
                {
                    target: "nodes[0].name",
                    value: "p",
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
    "value=not suport value": [
        ...createOptionCommonCases(
            "allowStartTagBoundaryNearSpace",
            2,
            "value is number like true"
        ),
        ...createOptionCommonCases(
            "allowStartTagBoundaryNearSpace",
            {},
            "value is object like true"
        ),
        ...createOptionCommonCases(
            "allowStartTagBoundaryNearSpace",
            null,
            "value is null like false"
        ),
        ...createOptionCommonCases(
            "allowStartTagBoundaryNearSpace",
            () => 3,
            "value is function return like true"
        ),
        ...createOptionCommonCases(
            "allowStartTagBoundaryNearSpace",
            () => null,
            "value is function return like false"
        ),
    ],
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
        {
            desc: "PI start tag left boundary has space",
            xml: "< ?xml?>",
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
            desc: "Child is PI and PI start tag left boundary has space",
            xml: "<p>< ?xml?></p>",
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
            desc: "PI end tag left boundary has space",
            xml: "<?xml? >",
            options: {
                allowStartTagBoundaryNearSpace: false,
            },
            items: [
                {
                    target: "!error",
                },
                {
                    target: "nodes[0].name",
                    value: "xml",
                },
            ],
        },
        {
            desc: "DTD start tag left boundary has space (1)",
            xml: "< !ELEMENT br EMPTY>",
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
            desc: "DTD start tag left boundary has space (2)",
            xml: "<! ELEMENT br EMPTY><p/>",
            options: {
                allowStartTagBoundaryNearSpace: false,
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
                    target: "nodes[0].name",
                    value: "ELEMENT",
                },
                {
                    target: "nodes[0].locationInfo.startTag.name.startOffset",
                    value: 3,
                },
            ],
        },
        {
            desc: "DTD start tag right boundary has space (1)",
            xml: "<!ELEMENT br EMPTY >",
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
                    value: 18,
                },
            ],
        },
        {
            desc: "DTD start tag right boundary has space (2)",
            xml: " <!DOCTYPE note [\n<!ELEMENT note (to,from,heading,body)>\n]>",
            options: {
                allowStartTagBoundaryNearSpace: false,
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
                    target: "nodes[1].locationInfo.startTag.endOffset",
                    value: 16,
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

export const allowEndTagBoundaryNearSpace: FxTestCaseMap = {
    "value=not suport value": [
        ...createOptionCommonCases("allowEndTagBoundaryNearSpace", 2, "value is number like true"),
        ...createOptionCommonCases("allowEndTagBoundaryNearSpace", {}, "value is object like true"),
        ...createOptionCommonCases(
            "allowEndTagBoundaryNearSpace",
            null,
            "value is null like false"
        ),
        ...createOptionCommonCases(
            "allowEndTagBoundaryNearSpace",
            () => 3,
            "value is function return like true"
        ),
        ...createOptionCommonCases(
            "allowEndTagBoundaryNearSpace",
            () => null,
            "value is function return like false"
        ),
    ],
    "value=true": [
        ...createOptionCommonCases("allowEndTagBoundaryNearSpace", true),
        {
            desc: "Element node end tag left boundary has space (1)",
            xml: "<div>\n<p>< /p>",
            items: [
                {
                    target: "!error",
                },
                {
                    target: "nodes[0].children[1].name",
                    value: "p",
                },
                {
                    target: "nodes[0].children[1].locationInfo.endTag.name.startOffset",
                    value: 12,
                },
            ],
        },
    ],
    "value=false": [
        ...createOptionCommonCases("allowEndTagBoundaryNearSpace", false),
        {
            desc: "Selfcloseing node left boundary has space",
            xml: "< p />",
            options: {
                allowEndTagBoundaryNearSpace: false,
            },
            items: [
                {
                    target: "!error",
                },
                {
                    target: "nodes[0].name",
                    value: "p",
                },
            ],
        },
        {
            desc: "Selfcloseing node start tag right boundary has space",
            xml: "<p />",
            options: {
                allowEndTagBoundaryNearSpace: false,
            },
            items: [
                {
                    target: "!error",
                },
                {
                    target: "nodes[0].name",
                    value: "p",
                },
            ],
        },
        {
            desc: "Element end tag(not attrs) left boundary has space",
            xml: "<p>< /p>",
            options: {
                allowEndTagBoundaryNearSpace: false,
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
            desc: "Element(has attrs) end tag left boundary has space",
            xml: "<p hidden>< /p>",
            options: {
                allowEndTagBoundaryNearSpace: false,
            },
            items: [
                {
                    target: "error.code",
                    value: 1,
                },
                {
                    target: "error.offset",
                    value: 11,
                },
            ],
        },
        {
            desc: "Element end tag right boundary has space",
            xml: "<p></\np>",
            options: {
                allowEndTagBoundaryNearSpace: false,
            },
            items: [
                {
                    target: "error.code",
                    value: 1,
                },
                {
                    target: "error.offset",
                    value: 5,
                },
            ],
        },
        {
            desc: "Element end tag name has space",
            xml: "<span></s pan>",
            options: {
                allowEndTagBoundaryNearSpace: false,
            },
            items: [
                {
                    target: "error.code",
                    value: 14,
                },
                {
                    target: "error.offset",
                    value: 6,
                },
            ],
        },
        {
            desc: "Child end tag left boundary has space",
            xml: "<p><span>12< /span></p>",
            options: {
                allowEndTagBoundaryNearSpace: false,
            },
            items: [
                {
                    target: "error.code",
                    value: 1,
                },
                {
                    target: "error.offset",
                    value: 12,
                },
            ],
        },
        {
            desc: "Child end tag right boundary has space",
            xml: "<p><span></ span>",
            options: {
                allowEndTagBoundaryNearSpace: false,
            },
            items: [
                {
                    target: "error.code",
                    value: 1,
                },
                {
                    target: "error.offset",
                    value: 11,
                },
            ],
        },
    ],
    "value=FxBoundaryPosition.left": [
        ...createOptionCommonCases("allowEndTagBoundaryNearSpace", FxBoundaryPosition.left),
        {
            desc: "Selfcloseing node left boundary has space",
            xml: "<span>< p/>",
            options: {
                allowEndTagBoundaryNearSpace: FxBoundaryPosition.left,
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
                allowEndTagBoundaryNearSpace: FxBoundaryPosition.left,
            },
            items: [
                {
                    target: "!error",
                },
                {
                    target: "nodes[2].name",
                    value: "span",
                },
            ],
        },
        {
            desc: "Element end tag left boundary has space",
            xml: "<p><span>23</span>< /p>",
            options: {
                allowEndTagBoundaryNearSpace: FxBoundaryPosition.left,
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
                    value: 1,
                },
                {
                    target: "nodes[0].locationInfo.endTag.name.startOffset",
                    value: 21,
                },
            ],
        },
        {
            desc: "PI end tag left boundary has space",
            xml: "<?xml? >",
            options: {
                allowEndTagBoundaryNearSpace: FxBoundaryPosition.left,
            },
            items: [
                {
                    target: "!error",
                },
                {
                    target: "nodes[0].name",
                    value: "xml",
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
