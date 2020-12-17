const fs = require('fs');
const path = require('path');
var minify = require('html-minifier').minify;

const readyFile = fileName => fs.readFileSync(fileName, 'utf-8');
const writeFile = (fileName, content) => fs.writeFileSync(fileName, content, {
    encoding: 'utf-8'
});

const srcFile = path.resolve(__dirname, './index.src.html');
const distFile = path.resolve(__dirname, './index.html');


const res = minify(readyFile(srcFile), {
    removeAttributeQuotes: true,
    minifyCSS: true,
    minifyJS: true,
    collapseWhitespace: true
});
console.log(res)
writeFile(distFile, res);