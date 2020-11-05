import { LxMessage } from "./types";

export const BOUNDARY_HAS_SPACE: LxMessage = {
    code: 1,
    message: "边界符附近存在空白字符",
};
export const TAG_HAS_MORE_BOUNDARY_CHAR: LxMessage = {
    code: 2,
    message: "标签名称中含有多个边界符“<”",
};
export const TAG_NAME_IS_EMPTY: LxMessage = {
    code: 3,
    message: "标签名称为空",
};
export const TAG_NOT_CLOSE: LxMessage = {
    code: 4,
    message: "标签未闭合",
};
export const ATTR_NAME_IS_EMPTY: LxMessage = {
    code: 5,
    message: "属性名称为空",
};
export const ATTR_CONTENT_HAS_BR: LxMessage = {
    code: 6,
    message: "属性值中包含换行符",
};
export const ATTR_HAS_MORE_EQUAL: LxMessage = {
    code: 7,
    message: "属性中含有多个“=“",
};
export const ATTR_NAME_IS_WRONG: LxMessage = {
    code: 8,
    message: "属性名称非法，可能含有“<”，“'”，“\"”等字符",
};
export const ATTR_IS_WRONG: LxMessage = {
    code: 9,
    message: "属性表达式非法",
};
export const ATTR_BOUNDARY_CHAR_NOT_EQUAL: LxMessage = {
    code: 10,
    message: "属性表达式中前后引号不一致",
};
export const TAG_NAME_NOT_EQUAL: LxMessage = {
    code: 11,
    message: "标签名称前后不一致",
};
export const ATTR_EQUAL_NEAR_SPACE: LxMessage = {
    code: 12,
    message: "标签“=”附近存在空白字符",
};
export const TAG_NAME_NEAR_SPACE: LxMessage = {
    code: 13,
    message: "标签名称附近存在空白字符",
};
