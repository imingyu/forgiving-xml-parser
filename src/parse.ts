import {
    FxEventType,
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
    findNodeAdapter,
    isFunc,
    filterOptions,
    stepToJSON,
} from "./util";
import { DEFAULT_PARSE_OPTIONS } from "./var";
import { fireEvent } from "./option";
import { NOT_MATCH_ADAPTER } from "./message";

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
            const adapter = findNodeAdapter(
                context.xml,
                {
                    lineNumber: context.lineNumber,
                    column: context.column,
                    offset: context.offset,
                },
                context.options
            );
            if (adapter) {
                adapter.parse(context);
                continue;
            } else {
                const err: FxWrong = (new Error(NOT_MATCH_ADAPTER.message) as unknown) as FxWrong;
                Object.assign(err, NOT_MATCH_ADAPTER);
                err.offset = context.offset;
                err.lineNumber = context.lineNumber;
                err.column = context.column;
                fireEvent(FxEventType.error, context, err as FxWrong);
                throw err;
            }
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
