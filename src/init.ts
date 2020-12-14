import { CommentParser } from "./node/comment";
import { CDATAParser } from "./node/cdata";
import { ElementParser } from "./node/element";
import { DtdParser } from "./node/dtd";
import { ProcessingInstructionParser } from "./node/pi";
import {
    LxEventHandler,
    LxEventType,
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
DEFAULT_PARSE_OPTIONS.nodeAdapters = [...DEFAULT_NODE_PARSERS];

export class LxParser {
    options: LxParserOptions;
    events: {
        [p: string]: LxEventHandler[];
    };
    constructor(options?: LxParserOptions) {
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
    _eventHandler(type: LxEventType) {
        if (this.events[type]) {
            const args = Array.from(arguments);
            this.events[type].forEach((item) => {
                item && item.apply(null, args);
            });
        }
    }
    on(eventName: LxEventType, handler: LxEventHandler) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(handler);
    }
    parse(xml: string, parseOptions?: LxParseOptions): LxParseResult {
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
                    nodeAdapters: this.options.nodeAdapters,
                },
                typeof serializeOptions === "object" && serializeOptions
                    ? serializeOptions
                    : {}
            )
        );
    }
}
