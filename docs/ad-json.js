tt =
{
    type: "element", name: "user",
    attrs: [
        {
            type: "attr", name: "name", equalCount: 1, boundaryChar: ['"', '"'], content: "Tom",
            locationInfo: { startLineNumber: 1, startColumn: 7, ... },
            steps: [
                { step: "nodeStart", cursor: { lineNumber: 1, column: 7, offset: 6 }, data: ["attr", "fullClosed"] },
                { step: "nodeNameStart", ... },
                ...
            ],
        },
        ...
    ],
    locationInfo: { ...},
    steps: [... ],
    children: [... ],
}
