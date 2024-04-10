export default {
    input: 'src/index.js',
    output: [
        { file: 'dist/index-esm.mjs', format: 'esm' },
        { file: 'dist/index-cjs.cjs', format: 'cjs' },
        { file: 'dist/index-umd.js', format: 'umd', name: 'regHiveParser' },
        { file: 'docs/index-umd.js', format: 'umd', name: 'regHiveParser' }
    ]
}
