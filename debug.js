const { parse, parseResultToJSON } = require('./dist/index.cjs.js');
const res = parse(`<p>哈哈哈
<div>
    <span>123</span>
    <b>你好
    <span>456</span>
</div>
<!-- abc -->`);
console.log(JSON.stringify(parseResultToJSON(res, {
    locationInfo: true
})));