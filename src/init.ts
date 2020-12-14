import { CommentParser } from "./node/comment";
import { CDATAParser } from "./node/cdata";
import { ElementParser } from "./node/element";
import { DtdParser } from "./node/dtd";
import { ProcessingInstructionParser } from "./node/pi";
import {
    FxEventHandler,
    FxEventType,
    FxNodeJSON,
    FxParseOptions,
    FxParseResult,
    FxParserOptions,
    FxSerializeOptions,
    FxToJSONOptions,
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
DEFAULT_PARSE_OPTIONS.nodeAdapters = [...DEFAULT_NODE_PARSERS];

export class FxParser {
    options: FxParserOptions;
    events: {
        [p: string]: FxEventHandler[];
    };
    constructor(options?: FxParserOptions) {
        options = typeof options !== "object" || !options ? {} : options;
        if (!options.nodeAdapters) {
            options.nodeAdapters = Object.create(DEFAULT_NODE_PARSERS);
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
        this.options = options;
        this.events = {};
        this._eventHandler = this._eventHandler.bind(this);
    }
    _eventHandler(type: FxEventType) {
        if (this.events[type]) {
            const args = Array.from(arguments);
            this.events[type].forEach((item) => {
                item && item.apply(null, args);
            });
        }
    }
    on(eventName: FxEventType, handler: FxEventHandler) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(handler);
    }
    parse(xml: string, parseOptions?: FxParseOptions): FxParseResult {
        return parse(
            xml,
            Object.assign(
                {
                    nodeAdapters: [...this.options.nodeAdapters],
                    onEvent: this._eventHandler,
                },
                this.options.parseOptions,
                typeof parseOptions === "object" && parseOptions
                    ? parseOptions
                    : {}
            )
        );
    }
    parseResultToJSON(parseResult: FxParseResult, options?: FxToJSONOptions) {
        return parseResultToJSON(parseResult, options);
    }
    serialize(
        json: FxNodeJSON | FxNodeJSON[],
        serializeOptions?: FxSerializeOptions
    ): string {
        return serialize(
            json,
            Object.assign(
                {
                    nodeAdapters: this.options.nodeAdapters,
                },
                typeof serializeOptions === "object" && serializeOptions
                    ? serializeOptions
                    : {}
            )
        );
    }
}
