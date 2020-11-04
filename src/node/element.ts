import {
    LxCursorPosition,
    LxEventType,
    LxNode,
    LxNodeJSON,
    LxNodeNature,
    LxNodeParser,
    LxNodeSerializer,
    LxNodeType,
    LxParseContext,
    LxParseOptions,
    LxSerializeOptions,
    LxTryStep,
} from "../types";
import {
    createLxError,
    currentIsLineBreak,
    moveCursor,
    repeatString,
} from "../util";
import {
    TAG_BOUNDARY_HAS_SPACE,
    TAG_HAS_MORE_BOUNDARY_CHAR,
    TAG_NOT_CLOSE,
} from "../message";
import { tryParseElementAttrs } from "./attr";
import { boundStepsToContext } from "../init";
import { DEFAULT_PARSE_OPTIONS, REX_SPACE } from "../var";
import { checkOptionAllow } from "../option";
export const trySelfClose = (
    xml: string,
    cursor: LxCursorPosition,
    steps: LxTryStep[],
    tagName: string
) => {
    const char = xml[cursor.offset];
    if (xml[cursor.offset + 1] === "/" && xml[cursor.offset + 2] === ">") {
        tagName += char;
        steps.push({
            step: LxEventType.nodeNameEnd,
            cursor: {
                ...cursor,
            },
            data: tagName,
        });
        steps.push({
            step: LxEventType.attrsEnd,
            cursor: {
                ...cursor,
            },
        });

        moveCursor(cursor, 0, 2, 2);
        steps.push({
            step: LxEventType.startTagEnd,
            cursor: {
                ...cursor,
            },
        });
        steps.push({
            step: LxEventType.nodeEnd,
            cursor: {
                ...cursor,
            },
            data: [LxNodeType.element, true],
        });
        return true;
    }
};
export const tryParseStartTag = (
    xml: string,
    cursor: LxCursorPosition,
    options?: LxParseOptions
) => {
    let steps: LxTryStep[] = [];
    const xmlLength = xml.length;
    steps.push({
        step: LxEventType.nodeStart,
        cursor: {
            ...cursor,
        },
        data: [LxNodeType.element, LxNodeNature.children],
    });
    steps.push({
        step: LxEventType.startTagStart,
        cursor: {
            ...cursor,
        },
    });
    moveCursor(cursor, 0, 1, 1);
    const elementNodeNameStartStep: LxTryStep = {
        step: LxEventType.nodeNameStart,
        cursor: {
            ...cursor,
        },
    };
    let elementAttrsStartStep: LxTryStep;
    let startTagCloseRight;
    let hasError;
    let needParseAttrs;
    let tagName = "";
    for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
        const char = xml[cursor.offset];
        if (char === "<") {
            steps.push({
                step: LxEventType.error,
                cursor: {
                    ...cursor,
                },
                data: createLxError(TAG_HAS_MORE_BOUNDARY_CHAR, cursor),
            });
            hasError = true;
            break;
        }
        if (REX_SPACE.test(char)) {
            needParseAttrs = true;
            const brType = currentIsLineBreak(xml, cursor.offset);
            if (brType != -1) {
                moveCursor(cursor, 1, -cursor.column, !brType ? 0 : 1);
            }
            elementAttrsStartStep = {
                step: LxEventType.attrsStart,
                cursor: {
                    ...cursor,
                },
            };
            moveCursor(cursor, 0, 1, 1);
            break;
        }
        if (REX_SPACE.test(xml[cursor.offset + 1])) {
            tagName += char;
            steps.push(elementNodeNameStartStep);
            steps.push({
                step: LxEventType.nodeNameEnd,
                cursor: {
                    ...cursor,
                },
                data: tagName,
            });
            needParseAttrs = true;
            const brType = currentIsLineBreak(xml, cursor.offset);
            if (brType != -1) {
                moveCursor(cursor, 1, -cursor.column, !brType ? 0 : 1);
            } else {
                moveCursor(cursor, 0, 1, 1);
            }
            steps.push({
                step: LxEventType.attrsStart,
                cursor: {
                    ...cursor,
                },
            });
            break;
        }
        const selfClose =
            xml[cursor.offset + 1] === "/" && xml[cursor.offset + 2] === ">";
        if (xml[cursor.offset + 1] === ">" || selfClose) {
            steps.push(elementNodeNameStartStep);
            tagName += char;
            steps.push({
                step: LxEventType.nodeNameEnd,
                cursor: {
                    ...cursor,
                },
                data: tagName,
            });
            moveCursor(cursor, 0, selfClose ? 2 : 1, selfClose ? 2 : 1);
            steps.push({
                step: LxEventType.startTagEnd,
                cursor: {
                    ...cursor,
                },
            });
            steps.push({
                step: LxEventType.nodeEnd,
                cursor: {
                    ...cursor,
                },
                data: selfClose
                    ? [LxNodeType.element, true]
                    : LxNodeType.element,
            });
            startTagCloseRight = true;
            break;
        }
        tagName += char;
    }
    if (needParseAttrs) {
        const attrSteps = tryParseElementAttrs(
            xml,
            cursor,
            LxNodeType.element,
            options
        );
        if (!tagName) {
            // startTag开头位置出现空白字符，导致直接开始解析属性，此时需要判断第一个属性是否属于tagName
            let firstAttrNodeEndIndex;
            const attrs = boundStepsToContext(
                attrSteps,
                null,
                (stepItem: LxTryStep, stepItemIndex: number): boolean => {
                    firstAttrNodeEndIndex = stepItemIndex;
                    return (
                        stepItem.step === LxEventType.nodeEnd ||
                        stepItem.step === LxEventType.startTagEnd
                    );
                }
            );
            // 判断第一个属性仅存在名称
            if (
                attrs[0] &&
                attrs[0].type === LxNodeType.attr &&
                !attrs[0].equalCount &&
                !attrs[0].content
            ) {
                const attrName = attrs[0].name;
                // 检测option
                if (
                    !checkOptionAllow(
                        options,
                        "allowStartTagLeftBoundarySpace",
                        DEFAULT_PARSE_OPTIONS.allowStartTagLeftBoundarySpace,
                        attrName,
                        elementNodeNameStartStep.cursor
                    )
                ) {
                    steps.push({
                        step: LxEventType.error,
                        cursor: {
                            ...elementNodeNameStartStep.cursor,
                        },
                        data: createLxError(
                            TAG_BOUNDARY_HAS_SPACE,
                            elementNodeNameStartStep.cursor
                        ),
                    });
                }
                // 设置正确的tagName及插入nodeNameStart,nodeNameEnd
                const firstAttrSteps = attrSteps.splice(
                    0,
                    firstAttrNodeEndIndex + 1
                );
                const attrNameStartStep = firstAttrSteps.find(
                    (item) => item.step === LxEventType.nodeNameStart
                );
                const attrNameEndStep =
                    firstAttrSteps[firstAttrSteps.length - 1];
                attrNameEndStep.data = attrName;
                Object.assign(
                    elementNodeNameStartStep.cursor,
                    attrNameStartStep.cursor
                );
                steps.push(elementNodeNameStartStep, attrNameEndStep);

                // 插入有效的attsStart，光标位置取nodeNameEnd的后一位
                Object.assign(elementAttrsStartStep.cursor, {
                    lineNumber: attrNameEndStep.cursor.lineNumber,
                    offset: attrNameEndStep.cursor.offset + 1,
                    column: attrNameEndStep.cursor.column + 1,
                });
                steps.push(elementAttrsStartStep);
                steps = steps.concat(attrSteps);
            }
        } else {
            steps = steps.concat(attrSteps);
        }
        startTagCloseRight = true;
    }
    if (!hasError && !startTagCloseRight) {
        steps.push({
            step: LxEventType.error,
            cursor: {
                ...cursor,
            },
            data: createLxError(TAG_NOT_CLOSE, cursor),
        });
        steps.push({
            step: LxEventType.nodeNameEnd,
            cursor: {
                ...cursor,
            },
            data: tagName,
        });
        steps.push({
            step: LxEventType.nodeEnd,
            cursor: {
                ...cursor,
            },
            data: LxNodeType.element,
        });
    }
    return steps;
};

export const ElementParser: LxNodeParser = {
    nodeNature: LxNodeNature.children,
    parseMatch: /<|<\//,
    parse(context: LxParseContext) {
        let steps: LxTryStep[];
        if (context.xml.substr(context.offset, 2) === "</") {
            // 解析endTag
        } else {
            steps = tryParseStartTag(
                context.xml,
                {
                    lineNumber: context.lineNumber,
                    column: context.column,
                    offset: context.offset,
                },
                context.options
            );
        }
        boundStepsToContext(steps, context);
    },
    serializeMatch(node: LxNodeJSON): boolean {
        return node.type === LxNodeType.element;
    },
    serialize(
        node: LxNodeJSON,
        brotherNodes: LxNodeJSON[],
        rootNodes: LxNodeJSON[],
        rootSerializer: LxNodeSerializer,
        options: LxSerializeOptions
    ): string {
        let res = "<";
        if (node.name) {
            res += node.name;
        }
        if (node.attrs && node.attrs.length) {
            res += "";
            node.attrs.forEach((attr) => {
                res += ` ${attr.name || ""}${repeatString(
                    "=",
                    attr.equalCount
                )}${attr.content || ""}`;
            });
        }
        if (node.selfcloseing) {
            res += " />";
            return res;
        }
        res += ">";
        if (node.children && node.children.length) {
            res += rootSerializer(node.children, options);
        }
        if (!node.notClose) {
            res += `</${node.name || ""}>`;
        }
        return res;
    },
};
