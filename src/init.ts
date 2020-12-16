import { CommentParser } from "./node/comment";
import { CDATAParser } from "./node/cdata";
import { ElementParser } from "./node/element";
import { DtdParser } from "./node/dtd";
import { ProcessingInstructionParser } from "./node/pi";
import {
    FxEventHandler,
    FxEventType,
    FxNodeJSON,
    FxNodeSerializeHandler,
    FxParseOptions,
    FxParseResult,
    FxParserOptions,
    FxSerializeBaseOptions,
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
        [p: string]: Array<FxEventHandler | FxNodeSerializeHandler>;
    };
    constructor(options?: FxParserOptions) {
        options = typeof options !== "object" || !options ? {} : options;
        if (!options.nodeAdapters) {
            options.nodeAdapters = Object.create(DEFAULT_NODE_PARSERS);
        }
        if (typeof options.parseOptions !== "object" || !options.parseOptions) {
            options.parseOptions = Object.create(DEFAULT_PARSE_OPTIONS);
        } else {
            options.parseOptions = Object.assign({}, DEFAULT_PARSE_OPTIONS, options.parseOptions);
        }
        this.options = options;
        this.events = {};
        this._parseEventHandler = this._parseEventHandler.bind(this);
    }
    _parseEventHandler(type: FxEventType) {
        if (this.events[type]) {
            const args = Array.from(arguments);
            this.events[type].forEach((item) => {
                item && item.apply(null, args);
            });
        }
    }
    _serializeEventHandler(): string {
        let res = arguments[arguments.length - 1];
        if (this.events.serialize) {
            const args = Array.from(arguments);
            this.events.serialize.forEach((item) => {
                res = (item && item.apply(null, args)) || res;
                args[args.length - 1] = res;
            });
        }
        return res;
    }
    on(eventName: FxEventType | "serialize", handler: FxEventHandler | FxNodeSerializeHandler) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(handler);
    }
    parse(xml: string, parseOptions?: FxParseOptions): FxParseResult {
        return parse(
            xml,
            Object.assign(
                {},
                this.options.parseOptions,
                typeof parseOptions === "object" && parseOptions ? parseOptions : {},
                {
                    nodeAdapters: [...this.options.nodeAdapters],
                    onEvent: this._parseEventHandler,
                }
            )
        );
    }
    parseResultToJSON(parseResult: FxParseResult, options?: FxToJSONOptions) {
        return parseResultToJSON(parseResult, options);
    }
    serialize(json: FxNodeJSON | FxNodeJSON[], serializeOptions?: FxSerializeBaseOptions): string {
        return serialize(
            json,
            Object.assign(
                {
                    nodeAdapters: this.options.nodeAdapters,
                    nodeSerializeHandler: this._serializeEventHandler,
                },
                typeof this.options.serializeOptions === "object" && this.options.serializeOptions
                    ? this.options.serializeOptions
                    : {},
                typeof serializeOptions === "object" && serializeOptions ? serializeOptions : {}
            )
        );
    }
}
