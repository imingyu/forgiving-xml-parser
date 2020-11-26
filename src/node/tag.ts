// import {
//     LxCursorPosition,
//     LxEventType,
//     LxNode,
//     LxNodeCloseType,
//     LxNodeJSON,
//     LxNodeNature,
//     LxNodeParser,
//     LxNodeParserAllowNodeNotCloseOption,
//     LxNodeSerializer,
//     LxNodeType,
//     LxParseContext,
//     LxParseOptions,
//     LxSerializeOptions,
//     LxTryStep,
// } from "../types";
// import {
//     checkElementEndTagStart,
//     createStep,
//     currentIsLineBreak,
//     equalCursor,
//     getEndCharCursor,
//     moveCursor,
//     pushStep,
// } from "../util";
// import {
//     BOUNDARY_HAS_SPACE,
//     END_TAG_NOT_MATCH_START,
//     TAG_HAS_MORE_BOUNDARY_CHAR,
//     TAG_NAME_IS_EMPTY,
//     TAG_NAME_NEAR_SPACE,
//     TAG_NOT_CLOSE,
// } from "../message";
// import { AttrParser, tryParseAttrs } from "./attr";
// import { boundStepsToContext } from "../init";
// import { DEFAULT_PARSE_OPTIONS, REX_SPACE } from "../var";
// import { checkAllowNodeNotClose, checkOptionAllow } from "../option";
// export const tryParseStartTag = (
//     xml: string,
//     cursor: LxCursorPosition,
//     options: LxParseOptions,
//     nodeParser: LxNodeParser
// ) => {
//     let steps: LxTryStep[] = [];
//     const nodeType = nodeParser.nodeType;
//     const xmlLength = xml.length;
//     pushStep(steps, LxEventType.nodeStart, cursor, nodeParser);
//     pushStep(steps, LxEventType.startTagStart, cursor);
//     moveCursor(cursor, 0, 1, 1);
//     const elementNodeNameStartStep: LxTryStep = createStep(
//         LxEventType.nodeNameStart,
//         cursor
//     );
//     let elementAttrsStartStep: LxTryStep;
//     let needParseAttrs;
//     let tagName = "";
//     const fireStartTagEnd = (startTagEndCursor: LxCursorPosition) => {
//         if (
//             !tagName &&
//             !checkOptionAllow(
//                 options,
//                 "allowNodeNameEmpty",
//                 DEFAULT_PARSE_OPTIONS.allowNodeNameEmpty,
//                 tagName,
//                 xml,
//                 elementNodeNameStartStep.cursor,
//                 nodeParser
//             )
//         ) {
//             pushStep(
//                 steps,
//                 LxEventType.error,
//                 elementNodeNameStartStep.cursor,
//                 TAG_NAME_IS_EMPTY
//             );
//         }
//         const selfClose = xml[cursor.offset] === "/";
//         Object.assign(cursor, startTagEndCursor);
//         pushStep(steps, LxEventType.startTagEnd, cursor);
//         selfClose &&
//             pushStep(steps, LxEventType.nodeEnd, cursor, [
//                 LxNodeType.element,
//                 LxNodeCloseType.selfCloseing,
//             ]);
//     };
//     for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
//         const char = xml[cursor.offset];
//         if (char === "<") {
//             return pushStep(
//                 steps,
//                 LxEventType.error,
//                 cursor,
//                 TAG_HAS_MORE_BOUNDARY_CHAR
//             );
//         }
//         if (REX_SPACE.test(char)) {
//             needParseAttrs = true;
//             elementAttrsStartStep = createStep(LxEventType.attrsStart, cursor);
//             const brType = currentIsLineBreak(xml, cursor.offset);
//             if (brType != -1) {
//                 moveCursor(cursor, 1, -cursor.column + 1, !brType ? 0 : 1);
//             } else {
//                 moveCursor(cursor, 0, 1, 1);
//             }
//             break;
//         }
//         if (REX_SPACE.test(xml[cursor.offset + 1])) {
//             tagName += char;
//             steps.push(elementNodeNameStartStep);
//             pushStep(steps, LxEventType.nodeNameEnd, cursor, tagName);
//             needParseAttrs = true;
//             moveCursor(cursor, 0, 1, 1);
//             pushStep(steps, LxEventType.attrsStart, cursor);
//             const brType = currentIsLineBreak(xml, cursor.offset);
//             if (brType != -1) {
//                 moveCursor(cursor, 1, -cursor.column + 1, !brType ? 0 : 1);
//             }
//             break;
//         }
//         let startTagEndCursor = nodeParser.checkAttrsEnd(xml, cursor, options);
//         if (startTagEndCursor) {
//             fireStartTagEnd(startTagEndCursor);
//             break;
//         } else {
//             const nextCursor = moveCursor(
//                 {
//                     ...cursor,
//                 },
//                 0,
//                 1,
//                 1
//             );
//             startTagEndCursor = nodeParser.checkAttrsEnd(
//                 xml,
//                 nextCursor,
//                 options
//             );
//             if (startTagEndCursor) {
//                 tagName += char;
//                 steps.push(elementNodeNameStartStep);
//                 pushStep(steps, LxEventType.nodeNameEnd, cursor, tagName);
//                 moveCursor(cursor, 0, 1, 1);
//                 fireStartTagEnd(startTagEndCursor);
//                 break;
//             }
//         }
//         tagName += char;
//     }
//     if (needParseAttrs) {
//         const attrSteps = tryParseAttrs(xml, cursor, nodeParser, options);
//         if (!tagName) {
//             // startTag开头位置出现空白字符，导致直接开始解析属性，此时需要判断第一个属性是否属于tagName
//             let firstAttrNodeEndIndex;
//             const attrs = boundStepsToContext(
//                 attrSteps,
//                 null,
//                 (stepItem: LxTryStep, stepItemIndex: number): boolean => {
//                     firstAttrNodeEndIndex = stepItemIndex;
//                     return (
//                         stepItem.step === LxEventType.nodeEnd ||
//                         stepItem.step === LxEventType.startTagEnd
//                     );
//                 }
//             );
//             // 判断第一个属性仅存在名称
//             if (attrs[0] && !attrs[0].equalCount && !attrs[0].content) {
//                 const attrName = attrs[0].name;
//                 // 检测option
//                 if (
//                     !checkOptionAllow(
//                         options,
//                         "allowStartTagBoundaryNearSpace",
//                         DEFAULT_PARSE_OPTIONS.allowStartTagBoundaryNearSpace,
//                         attrName,
//                         xml,
//                         elementNodeNameStartStep.cursor,
//                         nodeParser,
//                         attrName
//                     )
//                 ) {
//                     return pushStep(
//                         steps,
//                         LxEventType.error,
//                         elementNodeNameStartStep.cursor,
//                         BOUNDARY_HAS_SPACE
//                     );
//                 }
//                 // 设置正确的tagName及插入nodeNameStart,nodeNameEnd
//                 const firstAttrSteps = attrSteps.splice(
//                     0,
//                     firstAttrNodeEndIndex + 1
//                 );
//                 const attrNameStartStep = firstAttrSteps.find(
//                     (item) => item.step === LxEventType.nodeNameStart
//                 );
//                 const attrNameEndStep =
//                     firstAttrSteps[firstAttrSteps.length - 1];
//                 attrNameEndStep.data = attrName;
//                 Object.assign(
//                     elementNodeNameStartStep.cursor,
//                     attrNameStartStep.cursor
//                 );
//                 steps.push(elementNodeNameStartStep, attrNameEndStep);

//                 // 插入有效的attsStart，光标位置取nodeNameEnd的后一位
//                 Object.assign(elementAttrsStartStep.cursor, {
//                     lineNumber: attrNameEndStep.cursor.lineNumber,
//                     offset: attrNameEndStep.cursor.offset + 1,
//                     column: attrNameEndStep.cursor.column + 1,
//                 });
//                 steps.push(elementAttrsStartStep);
//             } else if (
//                 !checkOptionAllow(
//                     options,
//                     "allowNodeNameEmpty",
//                     DEFAULT_PARSE_OPTIONS.allowNodeNameEmpty,
//                     null,
//                     xml,
//                     elementNodeNameStartStep.cursor,
//                     nodeParser
//                 )
//             ) {
//                 return pushStep(
//                     steps,
//                     LxEventType.error,
//                     elementNodeNameStartStep.cursor,
//                     TAG_NAME_IS_EMPTY
//                 );
//             }
//         }
//         steps = steps.concat(attrSteps);
//         pushStep(steps, LxEventType.attrsEnd, cursor);
//         if (cursor.offset < xmlLength - 1) {
//             for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
//                 const startTagEndCursor = nodeParser.checkAttrsEnd(
//                     xml,
//                     cursor,
//                     options
//                 );
//                 if (startTagEndCursor) {
//                     fireStartTagEnd(startTagEndCursor);
//                     moveCursor(cursor, 0, 1, 1);
//                     break;
//                 }
//                 const brType = currentIsLineBreak(xml, cursor.offset);
//                 if (brType != -1) {
//                     moveCursor(cursor, 1, -cursor.column + 1, !brType ? 0 : 1);
//                 }
//             }
//         }
//     }
//     return steps;
// };

// export const tryParseEndTag = (
//     xml: string,
//     cursor: LxCursorPosition,
//     options: LxParseOptions,
//     nodeParser: LxNodeParser,
//     endTagStartCursor?: LxCursorPosition
// ): LxTryStep[] => {
//     let steps: LxTryStep[] = [];
//     const xmlLength = xml.length;
//     endTagStartCursor =
//         endTagStartCursor ||
//         checkElementEndTagStart(xml, {
//             ...cursor,
//         });
//     pushStep(steps, LxEventType.endTagStart, cursor);
//     const nextCursor: LxCursorPosition = {
//         lineNumber: cursor.lineNumber,
//         column: cursor.column + 1,
//         offset: cursor.offset + 1,
//     };
//     if (!equalCursor(nextCursor, endTagStartCursor)) {
//         if (
//             !checkOptionAllow(
//                 options,
//                 "allowEndTagBoundaryNearSpace",
//                 DEFAULT_PARSE_OPTIONS.allowEndTagBoundaryNearSpace,
//                 null,
//                 xml,
//                 nextCursor,
//                 nodeParser
//             )
//         ) {
//             return pushStep(
//                 steps,
//                 LxEventType.error,
//                 cursor,
//                 BOUNDARY_HAS_SPACE
//             );
//         }
//     }
//     Object.assign(cursor, endTagStartCursor);
//     // 将光标挪移到“/”的后一个字符
//     moveCursor(cursor, 0, 1, 1);
//     let closeRight;
//     let tagName = "";
//     let endTagEndCursorStep: LxTryStep;
//     for (; cursor.offset < xmlLength; moveCursor(cursor, 0, 1, 1)) {
//         const char = xml[cursor.offset];
//         if (REX_SPACE.test(char)) {
//             if (
//                 !checkOptionAllow(
//                     options,
//                     "allowEndTagBoundaryNearSpace",
//                     DEFAULT_PARSE_OPTIONS.allowEndTagBoundaryNearSpace,
//                     tagName,
//                     xml,
//                     cursor,
//                     nodeParser,
//                     tagName
//                 )
//             ) {
//                 return pushStep(
//                     steps,
//                     LxEventType.error,
//                     cursor,
//                     TAG_NAME_NEAR_SPACE
//                 );
//             }
//             const brType = currentIsLineBreak(xml, cursor.offset);
//             if (brType != -1) {
//                 moveCursor(cursor, 1, -cursor.column, !brType ? 0 : 1);
//             }
//             if (tagName) {
//                 tagName += char;
//             }
//             continue;
//         }
//         tagName += char;
//         const nextChar = xml[cursor.offset + 1];
//         if (nextChar === ">") {
//             const endCursor = moveCursor(
//                 {
//                     ...cursor,
//                 },
//                 0,
//                 1,
//                 1
//             );
//             if (endCursor) {
//                 tagName = tagName.trim();
//                 Object.assign(cursor, endCursor);
//                 endTagEndCursorStep = {
//                     step: LxEventType.endTagEnd,
//                     cursor: {
//                         ...cursor,
//                     },
//                     data: tagName,
//                 };
//                 closeRight = true;
//                 break;
//             }
//         }
//     }
//     if (closeRight) {
//         steps.push(endTagEndCursorStep);
//         pushStep(steps, LxEventType.nodeEnd, cursor, [
//             LxNodeType.element,
//             LxNodeCloseType.fullClosed,
//         ]);
//     }
//     return steps;
// };
