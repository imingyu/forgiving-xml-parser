import {
    LxEventType,
    LxMessage,
    LxNode,
    LxParseContext,
    LxParseOptions,
    LxParseOptionsKeys,
    LxWrong,
} from "./types";
import { isFunc } from "./util";

export const throwError = (
    msg: LxMessage,
    context: LxParseContext,
    line?: number,
    col?: number,
    detail?: string
) => {
    const err = (new Error(msg.message) as unknown) as LxWrong;
    err.code = msg.code;
    err.lineNumber = line || context.lineNumber;
    err.column = col || context.column;
    err.offset = context.offset;
    if (detail) {
        err.detail = detail;
    }
    if (
        !context.options ||
        !context.options.checkError ||
        typeof context.options.checkError !== "function"
    ) {
        fireEvent(LxEventType.error, context, err);
        throw err;
    }
    const checkResult = context.options.checkError(err, context);
    if (checkResult === true) {
        fireEvent(LxEventType.error, context, err);
        throw err;
    }
    err.customIgnore = checkResult;
    fireEvent(LxEventType.warn, context, err);
    addWarn(context, err);
};

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

// export const equalTagName = (
//     context: LxParseContext,
//     node: LxNode,
//     endTagName: string
// ) => {
//     if (node.type === LxNodeType.element) {
//         const startTagName = node.name;
//         const lowerStartTagName = startTagName.toLowerCase();
//         if (endTagName !== startTagName) {
//             if (
//                 !isTrueOption(context, "ignoreTagNameCaseEqual") ||
//                 endTagName.toLowerCase() !== lowerStartTagName
//             ) {
//                 return false;
//             }
//         }
//     }
//     return true;
// };

// export const allowNodeNotClose = (
//     context: LxParseContext,
//     node: LxNode
// ): boolean => {
//     if (isTrueOption(context, "allowNodeNotClose")) {
//         if (context.options.allowNodeNotClose instanceof RegExp) {
//             return context.options.allowNodeNotClose.test(node.name);
//         }
//         if (typeof context.options.allowNodeNotClose === "function") {
//             return context.options.allowNodeNotClose(node, context);
//         }
//         return context.options.allowNodeNotClose === true;
//     }
//     return false;
// };

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
