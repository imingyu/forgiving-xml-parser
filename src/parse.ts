import {
    FxParseContext,
    FxParseOptions,
    FxParseResult,
    FxParseResultJSON,
    FxToJSONOptions,
} from "./types";
import { pick, nodeToJSON, lxWrongToJSON, moveCursor, findNodeParser } from "./util";
import { TextParser } from "./node/text";
import { DEFAULT_PARSE_OPTIONS } from "./var";

export const parse = (xml: string, options?: FxParseOptions): FxParseResult => {
    options = Object.assign(
        {},
        DEFAULT_PARSE_OPTIONS,
        typeof options === "object" && options ? options : {}
    );
    const context: FxParseContext = {
        offset: 0,
        xmlLength: xml.length,
        xml,
        maxLineNumber: 0,
        maxColumn: 0,
        lineNumber: 1,
        column: 1,
        nodes: [],
        options,
    };
    try {
        for (; context.offset < context.xmlLength; moveCursor(context, 0, 1, 1)) {
            const parser = findNodeParser(
                context.xml,
                {
                    lineNumber: context.lineNumber,
                    column: context.column,
                    offset: context.offset,
                },
                context.options
            );
            if (parser) {
                parser.parse(context);
                continue;
            }
            TextParser.parse(context);
        }
        return {
            xml,
            maxLine: context.maxLineNumber,
            maxCol: context.maxColumn,
            nodes: context.nodes,
        } as FxParseResult;
    } catch (error) {
        return {
            error,
            xml,
        } as FxParseResult;
    }
};

export const parseResultToJSON = (
    parseResult: FxParseResult,
    options?: FxToJSONOptions
): FxParseResultJSON => {
    const res: FxParseResultJSON = {};
    if (parseResult.error) {
        res.error = lxWrongToJSON(parseResult.error);
    }
    pick("maxLine", res, parseResult, options);
    pick("maxCol", res, parseResult, options);
    pick("xml", res, parseResult, options);
    if (!parseResult.error) {
        res.nodes = parseResult.nodes.map((node) => nodeToJSON(node, options));
    }
    return res;
};
