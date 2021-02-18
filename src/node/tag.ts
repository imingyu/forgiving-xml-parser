import {
    FxCursorPosition,
    FxEventType,
    FxNode,
    FxNodeCloseType,
    FxNodeJSON,
    FxNodeNature,
    FxNodeAdapter,
    FxNodeParserAllowNodeNotCloseOption,
    FxNodeSerializer,
    FxNodeType,
    FxParseContext,
    FxParseOptions,
    FxSerializeOptions,
    FxTryStep,
    FxBoundaryPosition,
} from "../types";
import {
    createStep,
    currentIsLineBreak,
    equalCursor,
    filterFirstAttrSteps,
    findStartTagLevel,
    ignoreSpaceFindCharCursor,
    ignoreSpaceIsHeadTail,
    isElementEndTagBegin,
    moveCursor,
    pushStep,
    toCursor,
} from "../util";
import {
    BOUNDARY_HAS_SPACE,
    END_TAG_NOT_MATCH_START,
    TAG_HAS_MORE_BOUNDARY_CHAR,
    TAG_NAME_IS_EMPTY,
    TAG_NAME_NEAR_SPACE,
    TAG_NOT_CLOSE,
} from "../message";
import { tryParseAttrs, serializeNodeAttrs } from "./attr";
import {
    boundStepsToContext,
    checkAllowTagNameHasSpace,
    checkCommonOption,
    checkTagBoundaryNearSpace,
} from "../option";
import { DEFAULT_PARSE_OPTIONS, REX_SPACE } from "../var";
import { checkAllowNodeNotClose, checkOptionAllow } from "../option";
export const tryParseStartTag = (
    parser: FxNodeAdapter,
    xml: string,
    currentCursor: FxCursorPosition,
    options: FxParseOptions
): FxTryStep[] => {
    let leftBoundaryExpectedEndCursor: FxCursorPosition; // 左边界符期待的结束坐标
    let leftBoundaryActualEndCursor: FxCursorPosition; // 左边界符实际的结束坐标
    if (parser.nodeType === FxNodeType.element) {
        leftBoundaryExpectedEndCursor = toCursor(currentCursor);
        leftBoundaryActualEndCursor = toCursor(currentCursor);
    } else if (parser.nodeType === FxNodeType.dtd) {
        leftBoundaryExpectedEndCursor = moveCursor(toCursor(currentCursor), 0, 1, 1);
        leftBoundaryActualEndCursor = ignoreSpaceIsHeadTail(xml, currentCursor, "<", "!");
    } else if (parser.nodeType === FxNodeType.processingInstruction) {
        leftBoundaryExpectedEndCursor = moveCursor(toCursor(currentCursor), 0, 1, 1);
        leftBoundaryActualEndCursor = ignoreSpaceIsHeadTail(xml, currentCursor, "<", "?");
    } else {
        return [];
    }
    let steps: FxTryStep[] = [];
    const swimCursor = toCursor(currentCursor);
    pushStep(steps, FxEventType.nodeStart, swimCursor, parser);
    pushStep(steps, FxEventType.startTagStart, swimCursor);

    // 效验左边界符的右侧或中间是否存在空白符
    if (
        !equalCursor(leftBoundaryExpectedEndCursor, leftBoundaryActualEndCursor) &&
        !checkTagBoundaryNearSpace(
            options,
            "allowStartTagBoundaryNearSpace",
            DEFAULT_PARSE_OPTIONS.allowStartTagBoundaryNearSpace,
            xml,
            swimCursor,
            parser,
            "",
            FxBoundaryPosition.left,
            steps
        )
    ) {
        return pushStep(
            steps,
            FxEventType.error,
            moveCursor(toCursor(swimCursor), 0, 1, 1),
            BOUNDARY_HAS_SPACE
        );
    }

    // 将光标移动到【左边界符实际的结束坐标】
    Object.assign(swimCursor, leftBoundaryActualEndCursor);

    // 如果是pi node，则startTag结束
    if (parser.nodeType === FxNodeType.processingInstruction) {
        pushStep(steps, FxEventType.startTagEnd, swimCursor);
    }
    moveCursor(swimCursor, 0, 1, 1);
    let nodeName: string = "";
    let nodeNameExpectedStartCursor: FxCursorPosition = toCursor(swimCursor); // nodeName期待的起始坐标
    let nodeNameActualStartCursor: FxCursorPosition; // nodeName实际的起始坐标
    let nodeNameEndCursor: FxCursorPosition; // nodeName的结束坐标

    // 直接按照attr来解析，然后从中尝试寻找 nodeName
    const attrSteps = tryParseAttrs(xml, swimCursor, parser, options);
    if (attrSteps.length) {
        let hasEqual;
        let hasBrundary;
        const firstAttrSteps = filterFirstAttrSteps(attrSteps, (step: FxTryStep): boolean => {
            hasEqual = hasEqual || step.step === FxEventType.attrEqual;
            hasBrundary = hasBrundary || step.step === FxEventType.attrLeftBoundary;
            return (
                step.step === FxEventType.nodeNameStart ||
                step.step === FxEventType.nodeNameEnd ||
                step.step === FxEventType.nodeEnd
            );
        });
        if (firstAttrSteps.length === 3) {
            const [[, attrNameStartStep], [, attrNameEndStep], [attrEndStepIndex]] = firstAttrSteps;
            const attrName = attrNameEndStep.data as string;
            if (attrName && !hasBrundary && !hasEqual) {
                // 将第一个属性（其实是tagName）删掉
                attrSteps.splice(0, attrEndStepIndex + 1);
                nodeName = attrName;
                nodeNameActualStartCursor = attrNameStartStep.cursor;
                nodeNameEndCursor = attrNameEndStep.cursor;
            }
        }
    }

    if (nodeName) {
        pushStep(steps, FxEventType.nodeNameStart, nodeNameActualStartCursor);
        // 效验边界符与nodeName之间是否存在空白符
        let errMsg = BOUNDARY_HAS_SPACE;
        if (!equalCursor(nodeNameExpectedStartCursor, nodeNameActualStartCursor)) {
            let hasError;
            if (parser.nodeType === FxNodeType.element) {
                hasError = !checkTagBoundaryNearSpace(
                    options,
                    "allowStartTagBoundaryNearSpace",
                    DEFAULT_PARSE_OPTIONS.allowStartTagBoundaryNearSpace,
                    xml,
                    nodeNameExpectedStartCursor,
                    parser,
                    nodeName,
                    FxBoundaryPosition.left,
                    steps
                );
            } else {
                hasError = !checkAllowTagNameHasSpace(
                    options,
                    DEFAULT_PARSE_OPTIONS.allowTagNameHasSpace,
                    xml,
                    nodeNameExpectedStartCursor,
                    parser,
                    nodeName
                );
                errMsg = TAG_NAME_NEAR_SPACE;
            }
            if (hasError) {
                return pushStep(steps, FxEventType.error, nodeNameExpectedStartCursor, errMsg);
            }
        }
        pushStep(steps, FxEventType.nodeNameEnd, nodeNameEndCursor, nodeName);
    } else if (
        // 效验nodeName是否为空
        !checkCommonOption(
            options,
            "allowNodeNameEmpty",
            DEFAULT_PARSE_OPTIONS.allowNodeNameEmpty,
            xml,
            nodeNameExpectedStartCursor,
            parser,
            steps
        )
    ) {
        return pushStep(steps, FxEventType.error, nodeNameExpectedStartCursor, TAG_NAME_IS_EMPTY);
    }

    if (attrSteps.length) {
        pushStep(steps, FxEventType.attrsStart, attrSteps[0].cursor);
        steps = steps.concat(attrSteps);
        pushStep(steps, FxEventType.attrsEnd, swimCursor);
    }
    const xmlLength = xml.length;
    const attrsEndNextCursor = moveCursor(toCursor(swimCursor), 0, 1, 1);
    const rightBoundaryExpectedEndCursor: FxCursorPosition =
        parser.nodeType === FxNodeType.processingInstruction
            ? moveCursor(toCursor(swimCursor), 0, 2, 2)
            : moveCursor(toCursor(swimCursor), 0, 1, 1);
    let rightBoundaryActualEndCursor: FxCursorPosition = parser.checkAttrsEnd(
        xml,
        swimCursor,
        options
    );

    if (!rightBoundaryActualEndCursor && swimCursor.offset < xml.length - 1) {
        const tempCursor = toCursor(swimCursor);
        for (; tempCursor.offset < xmlLength; moveCursor(tempCursor, 0, 1, 1)) {
            const endCursor = parser.checkAttrsEnd(xml, tempCursor, options);
            if (endCursor) {
                rightBoundaryActualEndCursor = endCursor;
                break;
            }
            const brType = currentIsLineBreak(xml, tempCursor.offset);
            if (brType != -1) {
                moveCursor(tempCursor, 1, -tempCursor.column + 1, !brType ? 0 : 1);
            }
        }
    }

    if (rightBoundaryActualEndCursor) {
        const attrsEndAfterChars = xml.substring(
            attrsEndNextCursor.offset,
            rightBoundaryActualEndCursor.offset + 1
        );
        // 效验右边界符左侧或中间是否存在空白符
        if (
            REX_SPACE.test(attrsEndAfterChars) &&
            !equalCursor(rightBoundaryExpectedEndCursor, rightBoundaryActualEndCursor)
        ) {
            let hasError;
            if (parser.nodeType === FxNodeType.processingInstruction) {
                hasError = !checkTagBoundaryNearSpace(
                    options,
                    "allowEndTagBoundaryNearSpace",
                    DEFAULT_PARSE_OPTIONS.allowEndTagBoundaryNearSpace,
                    xml,
                    attrsEndNextCursor,
                    parser,
                    nodeName,
                    FxBoundaryPosition.left,
                    steps
                );
            } else if (
                parser.nodeType === FxNodeType.dtd &&
                xml[rightBoundaryActualEndCursor.offset] === "["
            ) {
                // <!DOCTYPE note [
            } else {
                hasError = !checkTagBoundaryNearSpace(
                    options,
                    "allowStartTagBoundaryNearSpace",
                    DEFAULT_PARSE_OPTIONS.allowStartTagBoundaryNearSpace,
                    xml,
                    attrsEndNextCursor,
                    parser,
                    nodeName,
                    FxBoundaryPosition.right,
                    steps
                );
            }
            if (hasError) {
                return pushStep(
                    steps,
                    FxEventType.error,
                    rightBoundaryExpectedEndCursor,
                    BOUNDARY_HAS_SPACE
                );
            }
        }

        if (parser.nodeType === FxNodeType.processingInstruction) {
            pushStep(steps, FxEventType.endTagStart, swimCursor);
            pushStep(steps, FxEventType.endTagEnd, rightBoundaryActualEndCursor);
        }
        Object.assign(swimCursor, rightBoundaryActualEndCursor);
        if (parser.nodeType !== FxNodeType.processingInstruction) {
            pushStep(steps, FxEventType.startTagEnd, swimCursor);
        }
        const selfClose =
            parser.nodeType === FxNodeType.element && attrsEndAfterChars.indexOf("/") !== -1;
        if (selfClose || parser.nodeType === FxNodeType.processingInstruction) {
            pushStep(steps, FxEventType.nodeEnd, swimCursor, [
                parser,
                selfClose ? FxNodeCloseType.selfCloseing : FxNodeCloseType.fullClosed,
            ]);
        }
    } else {
        // 标签未闭合
        if (
            !checkAllowNodeNotClose(null, null, parser, nodeName, options, xml, swimCursor, steps)
        ) {
            return pushStep(steps, FxEventType.error, swimCursor, TAG_NOT_CLOSE);
        }
        if (parser.nodeType !== FxNodeType.processingInstruction) {
            pushStep(steps, FxEventType.startTagEnd, swimCursor);
        }
        pushStep(steps, FxEventType.startTagEnd, swimCursor, [parser, FxNodeCloseType.notClosed]);
    }

    return steps;
};

export const tryParseEndTag = (
    parser: FxNodeAdapter,
    xml: string,
    currentCursor: FxCursorPosition,
    options: FxParseOptions
): FxTryStep[] => {
    let leftBoundaryExpectedEndCursor: FxCursorPosition = moveCursor(
        toCursor(currentCursor),
        0,
        1,
        1
    ); // 左边界符期待的结束坐标
    let leftBoundaryActualEndCursor: FxCursorPosition; // 左边界符实际的结束坐标
    if (parser.nodeType === FxNodeType.element) {
        leftBoundaryActualEndCursor = ignoreSpaceIsHeadTail(xml, currentCursor, "<", "/");
    } else if (parser.nodeType === FxNodeType.dtd) {
        leftBoundaryActualEndCursor = ignoreSpaceIsHeadTail(xml, currentCursor, "]", ">");
    } else {
        return [];
    }
    const steps: FxTryStep[] = [];
    const swimCursor = toCursor(currentCursor);
    pushStep(steps, FxEventType.endTagStart, swimCursor);

    // 效验左边界符的右侧或中间是否存在空白符
    if (
        !equalCursor(leftBoundaryExpectedEndCursor, leftBoundaryActualEndCursor) &&
        !checkTagBoundaryNearSpace(
            options,
            "allowEndTagBoundaryNearSpace",
            DEFAULT_PARSE_OPTIONS.allowEndTagBoundaryNearSpace,
            xml,
            swimCursor,
            parser,
            "",
            FxBoundaryPosition.left,
            steps
        )
    ) {
        return pushStep(
            steps,
            FxEventType.error,
            moveCursor(toCursor(swimCursor), 0, 1, 1),
            BOUNDARY_HAS_SPACE
        );
    }

    // 将光标移动到【左边界符实际的结束坐标】
    Object.assign(swimCursor, leftBoundaryActualEndCursor);

    if (parser.nodeType === FxNodeType.dtd) {
        pushStep(steps, FxEventType.endTagEnd, swimCursor);
        pushStep(steps, FxEventType.nodeEnd, swimCursor, parser);
        return steps;
    }

    // 将光标挪移到“/”的后一个字符
    moveCursor(swimCursor, 0, 1, 1);

    const closeEndTag = (nodeName: string, cursor: FxCursorPosition) => {
        if (!checkAllowNodeNotClose(null, null, parser, nodeName, options, xml, cursor, steps)) {
            return pushStep(steps, FxEventType.error, cursor, TAG_NOT_CLOSE);
        }
        pushStep(steps, FxEventType.endTagEnd, cursor, nodeName);
        pushStep(steps, FxEventType.nodeEnd, cursor, [parser, FxNodeCloseType.notClosed]);
    };

    const xmlLength = xml.length;
    if (swimCursor.offset > xmlLength - 1) {
        // 已经到了最后，但标签未闭合
        closeEndTag("", leftBoundaryActualEndCursor);
        return steps;
    }

    let tagNameExpectedStartCursor: FxCursorPosition = toCursor(swimCursor); // end tag name期待的开始坐标
    let tagNameActualStartCursor: FxCursorPosition; // end tag name实际的开始坐标
    let tagNameEndCursor: FxCursorPosition; // end tag name 结束坐标
    let _tagNameSpaceCursor: FxCursorPosition; // end tag name 中的第一个空白字符坐标
    let tagNameSpaceCursor: FxCursorPosition; // end tag name 中的第一个空白字符坐标
    let rightBoundaryExpectedCursor: FxCursorPosition; // end tag 右边界符坐标 期待的
    let rightBoundaryActualCursor: FxCursorPosition; // end tag 右边界符坐标 实际的
    let lastCursor: FxCursorPosition;
    let tagName: string = "";

    for (; swimCursor.offset < xmlLength; moveCursor(swimCursor, 0, 1, 1)) {
        const char = xml[swimCursor.offset];
        if (char === ">") {
            if (!rightBoundaryExpectedCursor) {
                rightBoundaryExpectedCursor = toCursor(swimCursor);
            }
            rightBoundaryActualCursor = toCursor(swimCursor);
            break;
        }
        lastCursor = toCursor(swimCursor);
        if (REX_SPACE.test(char)) {
            const brType = currentIsLineBreak(xml, swimCursor.offset);
            if (brType != -1) {
                moveCursor(swimCursor, 1, -swimCursor.column, !brType ? 0 : 1);
            }
            if (tagName) {
                tagName += char;
                _tagNameSpaceCursor = toCursor(swimCursor);
            }
            continue;
        }

        if (!tagNameActualStartCursor) {
            tagNameActualStartCursor = toCursor(swimCursor);
        }
        if (_tagNameSpaceCursor && !tagNameSpaceCursor) {
            tagNameSpaceCursor = _tagNameSpaceCursor;
        }
        tagName += char;
        tagNameEndCursor = toCursor(swimCursor);
        rightBoundaryExpectedCursor = moveCursor(toCursor(swimCursor), 0, 1, 1);
    }

    if (!tagNameActualStartCursor) {
        // end tag 里面全都是空白字符
        if (
            !checkTagBoundaryNearSpace(
                options,
                "allowEndTagBoundaryNearSpace",
                DEFAULT_PARSE_OPTIONS.allowEndTagBoundaryNearSpace,
                xml,
                tagNameExpectedStartCursor,
                parser,
                "",
                FxBoundaryPosition.left,
                steps
            )
        ) {
            return pushStep(
                steps,
                FxEventType.error,
                tagNameExpectedStartCursor,
                BOUNDARY_HAS_SPACE
            );
        }
        if (
            // 效验nodeName是否为空
            !checkCommonOption(
                options,
                "allowNodeNameEmpty",
                DEFAULT_PARSE_OPTIONS.allowNodeNameEmpty,
                xml,
                tagNameExpectedStartCursor,
                parser,
                steps
            )
        ) {
            return pushStep(
                steps,
                FxEventType.error,
                tagNameExpectedStartCursor,
                TAG_NAME_IS_EMPTY
            );
        }
    }
    if (
        !equalCursor(tagNameExpectedStartCursor, tagNameActualStartCursor) &&
        !checkTagBoundaryNearSpace(
            options,
            "allowEndTagBoundaryNearSpace",
            DEFAULT_PARSE_OPTIONS.allowEndTagBoundaryNearSpace,
            xml,
            tagNameExpectedStartCursor,
            parser,
            tagName,
            FxBoundaryPosition.left,
            steps
        )
    ) {
        return pushStep(steps, FxEventType.error, tagNameExpectedStartCursor, BOUNDARY_HAS_SPACE);
    }
    pushStep(steps, FxEventType.nodeNameStart, tagNameActualStartCursor);
    if (
        tagNameSpaceCursor &&
        !checkAllowTagNameHasSpace(
            options,
            DEFAULT_PARSE_OPTIONS.allowTagNameHasSpace,
            xml,
            tagNameSpaceCursor,
            parser,
            tagName
        )
    ) {
        return pushStep(steps, FxEventType.error, tagNameSpaceCursor, TAG_NAME_NEAR_SPACE);
    }
    pushStep(steps, FxEventType.nodeNameEnd, tagNameEndCursor, tagName);
    if (!rightBoundaryActualCursor) {
        // 没找到右边界符
        closeEndTag(tagName, tagNameExpectedStartCursor);
        return steps;
    }
    if (
        !equalCursor(rightBoundaryActualCursor, rightBoundaryExpectedCursor) &&
        !checkTagBoundaryNearSpace(
            options,
            "allowEndTagBoundaryNearSpace",
            DEFAULT_PARSE_OPTIONS.allowEndTagBoundaryNearSpace,
            xml,
            rightBoundaryExpectedCursor,
            parser,
            "",
            FxBoundaryPosition.right,
            steps
        )
    ) {
        return pushStep(steps, FxEventType.error, rightBoundaryExpectedCursor, BOUNDARY_HAS_SPACE);
    }
    pushStep(steps, FxEventType.endTagEnd, rightBoundaryActualCursor, tagName);
    pushStep(steps, FxEventType.nodeEnd, rightBoundaryActualCursor, [
        parser,
        FxNodeCloseType.fullClosed,
    ]);
    return steps;
};

const equalTagName = (
    endTagName: string,
    nodeAnterior: FxNode,
    context: FxParseContext
): boolean => {
    if (nodeAnterior.name === endTagName) {
        return true;
    }
    if (
        (nodeAnterior.name || "").toLowerCase() === (endTagName || "").toLowerCase() &&
        checkOptionAllow(
            context.options,
            "ignoreTagNameCaseEqual",
            DEFAULT_PARSE_OPTIONS.ignoreTagNameCaseEqual,
            nodeAnterior.name,
            endTagName,
            nodeAnterior,
            context
        )
    ) {
        return true;
    }
    return false;
};

export const matchTag = (
    parser: FxNodeAdapter,
    context: FxParseContext,
    endTagSteps: FxTryStep[]
): FxTryStep[] => {
    const lastStep = endTagSteps[endTagSteps.length - 1];
    if (lastStep.step !== FxEventType.error) {
        const endTagEndStep = endTagSteps.find((item) => item.step === FxEventType.endTagEnd);
        const endTagName = endTagEndStep.data as string;
        let matchStartTagLevel: number = -1;
        if (parser.nodeType === FxNodeType.element) {
            matchStartTagLevel = findStartTagLevel(endTagSteps, context, (node: FxNode) => {
                return equalTagName(endTagName, node, context);
            });
        } else {
            matchStartTagLevel = findStartTagLevel(endTagSteps, context, (node: FxNode) => {
                return !!(node.type === FxNodeType.dtd && node.children);
            });
        }
        if (matchStartTagLevel === -1) {
            const cursor = endTagSteps[0].cursor;
            endTagSteps = [];
            pushStep(endTagSteps, FxEventType.error, cursor, END_TAG_NOT_MATCH_START);
        } else if (matchStartTagLevel > 0) {
            let middleSteps = [];
            let node: FxNode;
            for (let level = 0; level < matchStartTagLevel; level++) {
                node = node ? node.parent : context.currentNode;
                const nodeLastStep = node.steps[node.steps.length - 1];
                const nodeFirstStep = node.steps[0];
                if (!checkAllowNodeNotClose(node, context, node.parser)) {
                    pushStep(endTagSteps, FxEventType.error, nodeLastStep.cursor, TAG_NOT_CLOSE);
                    break;
                }
                pushStep(middleSteps, FxEventType.nodeEnd, nodeLastStep.cursor, [
                    nodeFirstStep.data as FxNodeAdapter,
                    FxNodeCloseType.startTagClosed,
                ]);
            }
            endTagSteps = middleSteps.concat(endTagSteps);
        }
    }
    return endTagSteps;
};
