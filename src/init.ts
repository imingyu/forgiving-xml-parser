import { CommentParser } from "./node/comment";
import { CDATAParser } from "./node/cdata";
import { ElementParser } from "./node/element";
import { DtdParser } from "./node/dtd";
import { ProcessingInstructionParser } from "./node/pi";
import {
    LxNodeJSON,
    LxParseOptions,
    LxParseResult,
    LxParserOptions,
    LxSerializeOptions,
    LxToJSONOptions,
} from "./types";
import { DEFAULT_PARSE_OPTIONS } from "./var";
import { parse, parseResultToJSON } from "./parse";
import { serialize } from "./serialize";
const DEFAULT_NODE_PARSERS = [
    CommentParser,
    CDATAParser,
    ProcessingInstructionParser,
    DtdParser,
    ElementParser,
];
DEFAULT_PARSE_OPTIONS.nodeParsers = [...DEFAULT_NODE_PARSERS];

export class LxParser {
    options: LxParserOptions;
    constructor(options?: LxParserOptions) {
        options = typeof options !== "object" || !options ? {} : options;
        if (!options.nodeParsers) {
            options.nodeParsers = Object.create(DEFAULT_NODE_PARSERS);
        }
        if (typeof options.parseOptions !== "object" || !options.parseOptions) {
            options.parseOptions = Object.create(DEFAULT_PARSE_OPTIONS);
        } else {
            options.parseOptions = Object.assign(
                {},
                DEFAULT_PARSE_OPTIONS,
                options.parseOptions
            );
        }
        options.parseOptions.nodeParsers = [...options.nodeParsers];
        this.options = options;
    }
    parse(xml: string, parseOptions?: LxParseOptions): LxParseResult {
        return parse(
            xml,
            Object.assign(
                {},
                this.options.parseOptions,
                typeof parseOptions === "object" && parseOptions
                    ? parseOptions
                    : {}
            )
        );
    }
    parseResultToJSON(parseResult: LxParseResult, options?: LxToJSONOptions) {
        return parseResultToJSON(parseResult, options);
    }
    serialize(
        json: LxNodeJSON | LxNodeJSON[],
        serializeOptions?: LxSerializeOptions
    ): string {
        return serialize(
            json,
            Object.assign(
                {
                    nodeParsers: this.options.nodeParsers,
                },
                typeof serializeOptions === "object" && serializeOptions
                    ? serializeOptions
                    : {}
            )
        );
    }
}
