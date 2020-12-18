# forgiving-xml-parser

![image](https://img.shields.io/npm/l/forgiving-xml-parser.svg)
[![image](https://img.shields.io/npm/v/forgiving-xml-parser.svg)](https://www.npmjs.com/package/forgiving-xml-parser)

[Enligsh](./README.md) | 简体中文

一个在 JavaScript 平台上提供解析、序列化 XML/HTML 功能的工具类库。[在线预览](https://imingyu.github.io/forgiving-xml-parser/)

![spec](./docs/img/ad.png)

# 功能列表

-   解析 XML/HTML 为 JSON（可携带代码位置信息与解析步骤）
-   将 JSON 序列化为 XML
-   可以当做 node 包的方式使用，同时也可以在浏览器或类浏览器环境（如小程序）中使用
-   提供多种自定义解析/序列化选项
    -   设置某些解析行为（如是否允许`节点名称`为空）
    -   支持事件
    -   自定义节点解析器/序列器，定制某些特定 xml/html 语法的解析和序列化行为

# 使用

-   1.安装

```bash
# 使用 npm 安装
npm i forgiving-xml-parser -S
# 使用 yarn 安装
yarn add forgiving-xml-parser
```

-   2.引用

```javascript
// 在NodeJs环境中
const ForgivingXmlParser = require('forgiving-xml-parser');
const json = ForgivingXmlParser.parse('...');

// 在Webpack等打包工具环境中
import {parse, serialize, ...} from 'forgiving-xml-parser';
const json = parse('...');
```

```html
<!-- 在浏览器环境中 -->
<script src="xxx/forgiving-xml-parser.js"></script>
<script>
    // 本工具会暴露全局变量ForgivingXmlParser
    const json = ForgivingXmlParser.parse("...");
</script>
```

-   3.使用

```javascript
const { parse, serialize, parseResultToJSON, FxParser } = require("forgiving-xml-parser");

const xml = `<p>hi xml</p>`;
const json = parseResultToJSON(parse(xml), {
    allowAttrContentHasBr: true,
    allowNodeNameEmpty: true,
    allowNodeNotClose: true,
    allowStartTagBoundaryNearSpace: true,
    allowEndTagBoundaryNearSpace: true,
    allowTagNameHasSpace: true,
    allowNearAttrEqualSpace: true,
    ignoreTagNameCaseEqual: false,
    onEvent(type, context, data) {},
}); // { "nodes": [{ "type": "element", "name": "p", "children": [{ "type": "text", "content": "hi xml" }] }] }

serialize(json); // <p>hi xml</p>

const fxParser = new FxParser();
const json2 = parseResultToJSON(fxParser.parse(xml));
console.log(JSON.stringify(json2) === JSON.stringify(json)); // true
console.log(fxParser.serialize(json2) === serialize(json)); // true
```

# Api

<details>
<summary>Functions</summary>

-   **parse**(xml: `String`, options?: [LxParseOptions](src/types.ts#L178-L181)): [LxParseResult](src/types.ts#L266-L271)

-   **parseResultToJSON**(result: [LxParseResult](src/types.ts#L266-L271), options?: [LxToJSONOptions](src/types.ts#L251-L257)): [LxParseResultJSON](src/types.ts#L258-L265)

-   **serialize**(json: [LxNodeJSON](src/types.ts#L287-L299) | [LxNodeJSON](src/types.ts#L287-L299)[], options?: [LxSerializeOptions](src/types.ts#L60-L62)): `String`

-   **new FxParser**(options?: [LxParserOptions](src/types.ts#L335-L338))

    -   **parse**(xml: `String`, options?: [LxParseOptions](src/types.ts#L178-L181)): [LxParseResult](src/types.ts#L266-L271)

    -   **parseResultToJSON**(result: [LxParseResult](src/types.ts#L266-L271), options?: [LxToJSONOptions](src/types.ts#L251-L257)): [LxParseResultJSON](src/types.ts#L258-L265)

    -   **serialize**(json: [LxNodeJSON](src/types.ts#L287-L299) | [LxNodeJSON](src/types.ts#L287-L299)[], options?: [LxSerializeOptions](src/types.ts#L60-L62)): `String`

</details>

<details>
<summary>Options</summary>

-   [LxParserOptions](src/types.ts#L335-L338)
-   [LxParseOptions](src/types.ts#L178-L181)
-   [LxToJSONOptions](src/types.ts#L251-L257)
-   [LxSerializeOptions](src/types.ts#L60-L62)
</details>

<details>
<summary>NodeAdapters</summary>
</details>

<details>
<summary>事件触发时机</summary>

![Legend](./docs/img/legend.png)

</details>
