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
            }
            if (hasError) {
                return pushStep(
                    steps,
                    FxEventType.error,
                    nodeNameExpectedStartCursor,
                    BOUNDARY_HAS_SPACE
                );
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
