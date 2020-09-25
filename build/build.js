let { version } = require('../package.json');
const { babel } = require('@rollup/plugin-babel');
const { uglify } = require('rollup-plugin-uglify');
const rollupReplace = require('@rollup/plugin-replace');
const path = require('path');
const rollup = require('rollup');
const rollupTS = require('@rollup/plugin-typescript')
const { oneByOne, copyFiles, clearDir } = require('./util');
console.log(`🌟开始编译...`);

const srcDir = path.resolve(__dirname, '../src');
const distDir = path.resolve(__dirname, '../dist');

clearDir(distDir);
copyFiles(srcDir, distDir, srcFile => {
    return srcFile.endsWith('.d.ts');
}, true);

oneByOne(['cjs', 'esm', 'umd', 'umd.mini'].map(format => {
    return () => {
        const rollupConfig = {
            input: {
                input: path.join(srcDir, 'index.ts'),
                plugins: []
            },
            output: {
                format: format !== 'umd.mini' ? format : 'umd',
                file: path.join(distDir, `index.${format}.js`)
            }
        }

        rollupConfig.input.plugins.push(rollupReplace({
            VERSION: version
        }));
        rollupConfig.input.plugins.push(rollupTS({
            declaration: false,
            tsconfig: path.resolve(__dirname, '../tsconfig.json')
        }));
        rollupConfig.input.plugins.push(babel({
            extensions: ['.ts', '.js'],
            babelHelpers: 'bundled',
            include: [
                'src/*.ts'
            ],
            exclude: [
                'node_modules'
            ],
            extends: path.resolve(__dirname, '../.babelrc')
        }));
        if (format === 'umd.mini') {
            rollupConfig.output.name = 'LooseXmlParser';
            rollupConfig.input.plugins.push(uglify({
                sourcemap: true
            }));
        } else {
            if (format === 'umd') {
                rollupConfig.output.name = 'LooseXmlParser';
            }
            rollupConfig.output.sourcemap = true;
        }
        rollupConfig.output.banner = `/*!
        * loose-xml-parser v${version}
        * (c) 2020-${new Date().getFullYear()} imingyu<mingyuhisoft@163.com>
        * Released under the BSD 3-Clause License.
        * Github: https://github.com/imingyu/loose-xml-parser
        */`.split('\n').map(item => item.trim()).join('\n');
        return rollup.rollup(rollupConfig.input).then(res => {
            return res.write(rollupConfig.output);
        }).then(() => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    rollupConfig.options && rollupConfig.options.done && rollupConfig.options.done();
                    resolve();
                })
            })
        }).then(() => {
            console.log(`   编译成功：${rollupConfig.output.file}`);
        })
    }
})).then(() => {
    console.log(`🌈编译结束.`);
}).catch(err => {
    console.error(`🔥编译出错：${err.message}`);
    console.log(err);
});