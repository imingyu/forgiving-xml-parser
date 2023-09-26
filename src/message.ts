import { FxMessage } from "./types";

export const BOUNDARY_HAS_SPACE: FxMessage = {
    code: 1,
    message: "Boundary char near has sapce",
    messageCN: "边界符附近存在空白字符",
};
// export const TAG_HAS_MORE_BOUNDARY_CHAR: FxMessage = {
//     code: 2,
//     message: "Tag 标签名称中含有多个边界符“<”",
//     messageCN: "标签名称中含有多个边界符“<”",
// };
export const TAG_NAME_IS_EMPTY: FxMessage = {
    code: 3,
    message: "Tag name is empty",
    messageCN: "标签名称为空",
};
export const TAG_NOT_CLOSE: FxMessage = {
    code: 4,
    message: "Tag not close",
    messageCN: "标签未闭合",
};
export const ATTR_NAME_IS_EMPTY: FxMessage = {
    code: 5,
    message: "Attr name is empty",
    messageCN: "属性名称为空",
};
export const ATTR_CONTENT_HAS_BR: FxMessage = {
    code: 6,
    message: "Attr content has sapce",
    messageCN: "属性值中包含换行符",
};
export const ATTR_HAS_MORE_EQUAL: FxMessage = {
    code: 7,
    message: 'Attr has more "="',
    messageCN: "属性中含有多个“=“",
};
// export const ATTR_NAME_IS_WRONG: FxMessage = {
//     code: 8,
//     message: "属性名称非法，可能含有“<”，“'”，“\"”等字符",
// };
// export const ATTR_IS_WRONG: FxMessage = {
//     code: 9,
//     message: "属性表达式非法",
// };
// export const ATTR_BOUNDARY_CHAR_NOT_EQUAL: FxMessage = {
//     code: 10,
//     message: "属性表达式中前后引号不一致",
// };
// export const TAG_NAME_NOT_EQUAL: FxMessage = {
//     code: 11,
//     message: "标签名称前后不一致",
// };
export const ATTR_EQUAL_NEAR_SPACE: FxMessage = {
    code: 12,
    message: "Attr equal char near has space",
    messageCN: "属性“=”附近存在空白字符",
};
export const TAG_NAME_NEAR_SPACE: FxMessage = {
    code: 13,
    message: "Tag name has space",
    messageCN: "标签名称中含有空白字符",
};
export const END_TAG_NOT_MATCH_START: FxMessage = {
    code: 14,
    message: "Not match start tag",
    messageCN: "无法找到与之匹配的开始标签",
};
export const ATTR_BOUNDARY_NOT_RIGHT: FxMessage = {
    code: 15,
    message: "Attr not right boundary char",
    messageCN: "属性缺少右边界符",
};
export const ATTR_MORE_LEFT_BOUNDARY: FxMessage = {
    code: 15,
    message: "Attr has more left boundary char",
    messageCN: "属性包含多个左界符",
};
export const ATTR_UNEXPECTED_BOUNDARY: FxMessage = {
    code: 16,
    message: "Attr boundary char position is wrong",
    messageCN: "意外的边界符",
};
export const NOT_MATCH_ADAPTER: FxMessage = {
    code: 17,
    message: "Current char not match node adapter",
    messageCN: "未匹配到解析器，无法解析",
};
