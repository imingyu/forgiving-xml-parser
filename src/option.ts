import {
    LxEventType,
    LxMessage,
    LxNode,
    LxNodeParser,
    LxNodeParserAllowNodeNotCloseOption,
    LxParseContext,
    LxParseOptions,
    LxParseOptionsKeys,
    LxWrong,
} from "./types";
import { isFunc } from "./util";
export const addWarn = (context: LxParseContext, warn: LxWrong | LxMessage) => {
    if (!context.warnings) {
        context.warnings = [];
    }
    if ("line" in warn) {
        context.warnings.push(warn);
        return;
    }
    const tsWarn = warn as LxWrong;
    tsWarn.lineNumber = context.lineNumber;
    tsWarn.column = context.column;
    context.warnings.push(tsWarn);
};

export const fireEvent = (
    type: LxEventType,
    context: LxParseContext,
    data: LxNode | LxWrong
) => {
    context.options &&
        typeof context.options.onEvent === "function" &&
        context.options.onEvent(type, context, data);
};
export function isTrueOption(
    prop: LxParseOptionsKeys,
    options?: LxParseOptions
): boolean {
    return !!(options && options[prop]);
}

export function equalOption<P extends keyof LxParseOptions>(
    prop: P,
    value: LxParseOptions[P],
    options?: LxParseOptions,
    defaultValue?: LxParseOptions[P]
): boolean {
    if (options) {
        if (options[prop]) {
            return options[prop] === value;
        }
        return value === defaultValue;
    }
    return value === defaultValue;
}

export const checkOptionAllow = <
    T extends keyof LxParseOptions,
    CV = LxParseOptions[T] extends Function ? never : LxParseOptions[T]
>(
    options: LxParseOptions,
    optionName: T,
    defaultOptionValue: CV,
    testValue: string,
    ...optionCheckerArgs: any[]
): boolean => {
    if (!options || !(optionName in options)) {
        if (defaultOptionValue instanceof RegExp) {
            return (defaultOptionValue as RegExp).test(testValue);
        }
        return !!defaultOptionValue;
    }
    if (isFunc(options[optionName])) {
        return (options[optionName] as Function).apply(null, optionCheckerArgs);
    }
    if (options[optionName] instanceof RegExp) {
        return (options[optionName] as RegExp).test(testValue);
    }
    return !!options[optionName];
};

export const computeOption = <
    T extends keyof LxParseOptions,
    CV = LxParseOptions[T] extends Function ? never : LxParseOptions[T]
>(
    options: LxParseOptions,
    optionName: T,
    defaultOptionValue: CV,
    ...args: any[]
): CV => {
    if (!options || !(optionName in options)) {
        return defaultOptionValue;
    }
    if (isFunc(options[optionName])) {
        return (options[optionName] as Function).apply(null, args);
    }
    return (options[optionName] as unknown) as CV;
};

export const checkAllowNodeNotClose = (
    onlyAnteriorNode: LxNode,
    context: LxParseContext,
    parser: LxNodeParser
) => {
    if (
        parser.allowNodeNotClose === LxNodeParserAllowNodeNotCloseOption.allow
    ) {
        return true;
    }
    if (
        parser.allowNodeNotClose ===
        LxNodeParserAllowNodeNotCloseOption.notAllow
    ) {
        return false;
    }
    if (typeof parser.allowNodeNotClose === "function") {
        return parser.allowNodeNotClose(onlyAnteriorNode, context, parser);
    }
    if (!context.options || !context.options.allowNodeNotClose) {
        return false;
    }
    if (context.options.allowNodeNotClose instanceof RegExp) {
        return context.options.allowNodeNotClose.test(onlyAnteriorNode.name);
    }
    if (typeof context.options.allowNodeNotClose === "function") {
        return context.options.allowNodeNotClose(
            onlyAnteriorNode,
            context,
            parser
        );
    }
    return false;
};
