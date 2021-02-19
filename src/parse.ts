import {
    FxNodeJSON,
    FxParseContext,
    FxParseOptions,
    FxParseResult,
    FxParseResultJSON,
    FxToJSONOptions,
    FxWrong,
} from "./types";
import {
    pick,
    nodeToJSON,
    lxWrongToJSON,
    moveCursor,
    findNodeParser,
    isFunc,
    filterOptions,
    stepToJSON,
} from "./util";
import { TextParser } from "./node/text";
import { DEFAULT_PARSE_OPTIONS } from "./var";

export const parse = (xml: string, options?: FxParseOptions): FxParseResult => {
    options = filterOptions(DEFAULT_PARSE_OPTIONS, options);
    const context: FxParseContext = {
        offset: 0,
        xmlLength: xml.length,
        xml,
        maxLineNumber: 0,
        maxColumn: 0,
        lineNumber: 1,
        column: 1,
        nodes: [],
        steps: [],
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
            steps: context.steps,
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
    options = filterOptions(null, options);
    let hasFilter = isFunc(options.dataFilter);
    const res: FxParseResultJSON = {};
    if (parseResult.error) {
        if (hasFilter) {
            res.error = options.dataFilter(res.error, lxWrongToJSON(parseResult.error)) as FxWrong;
        } else {
            res.error = lxWrongToJSON(parseResult.error);
        }
    }
    pick("maxLine", res, parseResult, options);
    pick("maxCol", res, parseResult, options);
    pick("xml", res, parseResult, options);
    if (parseResult.steps && options.steps) {
        res.steps = parseResult.steps.map((step) => {
            return stepToJSON(step, options);
        });
    }
    if (!parseResult.error) {
        res.nodes = parseResult.nodes.map((node) => {
            if (hasFilter) {
                return options.dataFilter(node, nodeToJSON(node, options)) as FxNodeJSON;
            } else {
                return nodeToJSON(node, options) as FxNodeJSON;
            }
        });
    }
    return res;
};
