# loose-xml-parser

Enligsh | [简体中文](./README.zh-CN.md)

An XML/HTML parser and serializer for JavaScript.

# Features

-   Transform XML/HTML to JSON(carry code locationInfo or parse steps)
-   Transform JSON back to XML
-   Works with node packages, in browser(like browser such as Miniprogram)
-   Various options are available to customize the transformation
    -   custom parsing behavior(souch as allow `node-name` is empty)
    -   supported events
    -   custom node parser

# Usage

-   1.install

```bash
# using npm
npm i loose-xml-parser -S
# using yarn
yarn add loose-xml-parser
```

-   2.include

```javascript
// in node
const LooseXmlParser = require('loose-xml-parser');
const json = LooseXmlParser.parse('...');

// in webpack
import {parse, serialize, ...} from 'loose-xml-parser';
const json = parse('...');
```

```html
<!-- in browser -->
<script src="xxx/loose-xml-parser.js"></script>
<script>
    // global variable
    const json = LooseXmlParser.parse("...");
</script>
```

-   3.use

```javascript
const {
    parse,
    serialize,
    parseResultToJSON,
    LxParser,
} = require("loose-xml-parser");

const xml = `<p>hi xml</p>`;
const json = parseResultToJSON(parse(xml)); // { "nodes": [{ "type": "element", "name": "p", "children": [{ "type": "text", "content": "hi xml" }] }] }

serialize(json); // <p>hi xml</p>

const lxParser = new LxParser();
const json2 = parseResultToJSON(lxParser.parse(xml));
console.log(JSON.stringify(json2) === JSON.stringify(json)); // true
console.log(lxParser.serialize(json2) === serialize(json)); // true
```

# Api

<details>
<summary>Functions</summary>

-   **parse**(xml: `String`, options?: [LxParseOptions](src/types.ts#L178-L181)): [LxParseResult](src/types.ts#L266-L271)

-   **parseResultToJSON**(result: [LxParseResult](src/types.ts#L266-L271), options?: [LxToJSONOptions](src/types.ts#L251-L257)): [LxParseResultJSON](src/types.ts#L258-L265)

-   **serialize**(json: [LxNodeJSON](src/types.ts#L287-L299) | [LxNodeJSON](src/types.ts#L287-L299)[], options?: [LxSerializeOptions](src/types.ts#L60-L62)): `String`

</details>

<details>
<summary>Options</summary>
</details>

<details>
<summary>NodeAdapters</summary>
</details>

<details>
<summary>Event trigger timing</summary>

![Legend](./docs/img/legend.png)

![Element](./docs/img/element.png)

![Comment](./docs/img/comment.png)

![Text](./docs/img/text.png)

![CDATA](./docs/img/cdata.png)

![ProcessingInstruction](./docs/img/pi.png)

![DTD](./docs/img/dtd.png)

</details>
