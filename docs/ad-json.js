tt =
{
    type: "element", name: "user",
    attrs: [
        {
            type: "attr", name: "name", equalCount: 1, boundaryChar: ['"', '"'], content: "Tom",
            locationInfo: { startLineNumber: 1, startColumn: 7, startOffset: 6, endLineNumber: 1, endColumn: 16, endOffset: 15 },
            steps: [
                { step: "nodeStart", cursor: { lineNumber: 1, column: 7, offset: 6 }, data: ["attr", "fullClosed"] },
                { step: "nodeNameStart", cursor: { lineNumber: 1, column: 7, offset: 6 }, data: "attr" },
                { step: "nodeNameEnd", cursor: { lineNumber: 1, column: 10, offset: 9 }, data: "name" },
                { step: "attrEqual", cursor: { lineNumber: 1, column: 11, offset: 10 } },
                { step: "attrLeftBoundary", cursor: { lineNumber: 1, column: 12, offset: 11 }, data: '"' },
                { step: "nodeContentStart", cursor: { lineNumber: 1, column: 13, offset: 12 } },
                { step: "nodeContentEnd", cursor: { lineNumber: 1, column: 15, offset: 14 }, data: "Tom" },
                { step: "attrRightBoundary", cursor: { lineNumber: 1, column: 16, offset: 15 }, data: '"' },
                { step: "nodeEnd", cursor: { lineNumber: 1, column: 16, offset: 15 }, data: ["attr", "fullClosed"] },
            ],
        },
        {
            type: "attr", name: "male",
            locationInfo: { startLineNumber: 1, startColumn: 18, startOffset: 17, endLineNumber: 1, endColumn: 21, endOffset: 20 },
            steps: [
                { step: "nodeStart", cursor: { lineNumber: 1, column: 18, offset: 17 }, data: ["attr", "fullClosed"] },
                { step: "nodeNameStart", cursor: { lineNumber: 1, column: 18, offset: 17 }, data: "attr" },
                { step: "nodeNameEnd", cursor: { lineNumber: 1, column: 21, offset: 20 }, data: "male" },
                { step: "nodeEnd", cursor: { lineNumber: 1, column: 21, offset: 20 }, data: ["attr", "fullClosed"] },
            ],
        },
        {
            type: "attr", name: "age", equalCount: 1, content: "20",
            locationInfo: { startLineNumber: 1, startColumn: 23, startOffset: 22, endLineNumber: 1, endColumn: 28, endOffset: 27 },
            steps: [
                { step: "nodeStart", cursor: { lineNumber: 1, column: 23, offset: 22 }, data: ["attr", "fullClosed"] },
                { step: "nodeNameStart", cursor: { lineNumber: 1, column: 23, offset: 22 }, data: "attr" },
                { step: "nodeNameEnd", cursor: { lineNumber: 1, column: 25, offset: 24 }, data: "age" },
                { step: "attrEqual", cursor: { lineNumber: 1, column: 26, offset: 25 } },
                { step: "nodeContentStart", cursor: { lineNumber: 1, column: 27, offset: 26 } },
                { step: "nodeContentEnd", cursor: { lineNumber: 1, column: 28, offset: 27 }, data: "20" },
                { step: "nodeEnd", cursor: { lineNumber: 1, column: 28, offset: 27 }, data: ["attr", "fullClosed"] },
            ],
        },
    ],
    locationInfo: {
        startLineNumber: 1, startColumn: 1, startOffset: 0, endLineNumber: 1, endColumn: 38, endOffset: 37,
        startTag: { startLineNumber: 1, startColumn: 1, startOffset: 0, endLineNumber: 1, endColumn: 29, endOffset: 28 },
        attrs: [
            { startLineNumber: 1, startColumn: 7, startOffset: 6, endLineNumber: 1, endColumn: 16, endOffset: 15 },
            { startLineNumber: 1, startColumn: 18, startOffset: 17, endLineNumber: 1, endColumn: 21, endOffset: 20 },
            { startLineNumber: 1, startColumn: 23, startOffset: 22, endLineNumber: 1, endColumn: 28, endOffset: 27 },
        ],
        endTag: { startLineNumber: 1, startColumn: 32, startOffset: 31, endLineNumber: 1, endColumn: 38, endOffset: 37 },
    },
    steps: [
        { step: "nodeStart", cursor: { lineNumber: 1, column: 1, offset: 0 }, data: ["element", "fullClosed"] },
        { step: "startTagStart", cursor: { lineNumber: 1, column: 1, offset: 0 } },
        { step: "nodeNameStart", cursor: { lineNumber: 1, column: 2, offset: 1 } },
        { step: "nodeNameEnd", cursor: { lineNumber: 1, column: 5, offset: 4 }, data: "user" },
        { step: "attrsStart", cursor: { lineNumber: 1, column: 6, offset: 5 } },
        { step: "attrsEnd", cursor: { lineNumber: 1, column: 28, offset: 27 } },
        { step: "startTagEnd", cursor: { lineNumber: 1, column: 29, offset: 28 } },
        { step: "endTagStart", cursor: { lineNumber: 1, column: 32, offset: 31 } },
        { step: "endTagEnd", cursor: { lineNumber: 1, column: 38, offset: 37 }, data: "user" },
        { step: "nodeEnd", cursor: { lineNumber: 1, column: 38, offset: 37 }, data: ["element", "fullClosed"] },
    ],
    children: [
        {
            type: "text", content: "……",
            locationInfo: { startLineNumber: 1, startColumn: 30, startOffset: 29, endLineNumber: 1, endColumn: 31, endOffset: 30 },
            steps: [
                { step: "nodeStart", cursor: { lineNumber: 1, column: 30, offset: 29 }, data: ["text", "fullClosed"] },
                { step: "nodeContentStart", cursor: { lineNumber: 1, column: 30, offset: 29 } },
                { step: "nodeContentEnd", cursor: { lineNumber: 1, column: 31, offset: 30 }, data: "……" },
                { step: "nodeEnd", cursor: { lineNumber: 1, column: 31, offset: 30 }, data: ["text", "fullClosed"] },
            ],
        },
    ],
}