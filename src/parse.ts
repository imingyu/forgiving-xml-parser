import {
    LxParseContext,
    LxParseOptions,
    LxParseResult,
    LxParseResultJSON,
    LxToJSONOptions,
} from "./types";
import {
    pick,
    nodeToJSON,
    lxWrongToJSON,
    moveCursor,
    findNodeParser,
} from "./util";
import { DEFAULT_PARSE_OPTIONS } from "./var";
import { CommentParser } from "./node/comment";
import { CDATAParser } from "./node/cdata";
import { ElementParser } from "./node/element";
import { DtdParser } from "./node/dtd";
import { ProcessingInstructionParser } from "./node/pi";
import { TextParser } from "./node/text";
DEFAULT_PARSE_OPTIONS.nodeParser = [
    CommentParser,
    CDATAParser,
    ProcessingInstructionParser,
    DtdParser,
    ElementParser,
];

export const parse = (xml: string, options?: LxParseOptions): LxParseResult => {
    options = typeof options !== "object" ? {} : options;
    options = Object.assign({}, DEFAULT_PARSE_OPTIONS, options);
    const context: LxParseContext = {
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
        for (
            ;
            context.offset < context.xmlLength;
            moveCursor(context, 0, 1, 1)
        ) {
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
        } as LxParseResult;
    } catch (error) {
        return {
            error,
            xml,
        } as LxParseResult;
    }
};

export const parseResultToJSON = (
    parseResult: LxParseResult,
    options?: LxToJSONOptions
): LxParseResultJSON => {
    const res: LxParseResultJSON = {};
    if (parseResult.error) {
        res.error = lxWrongToJSON(parseResult.error);
    }
    if (parseResult.warnings) {
        res.warnings = parseResult.warnings.map((item) => lxWrongToJSON(item));
    }
    pick("maxLine", res, parseResult, options);
    pick("maxCol", res, parseResult, options);
    pick("xml", res, parseResult, options);
    if (!parseResult.error) {
        res.nodes = parseResult.nodes.map((node) => nodeToJSON(node, options));
    }
    return res;
};
