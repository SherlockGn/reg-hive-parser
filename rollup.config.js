export default {
    input: 'src/index.js',
    output: [
        { file: 'dist/index.mjs', format: 'esm' },
        { file: 'dist/index.cjs', format: 'cjs' },
        { file: 'dist/index.umd.js', format: 'umd', name: 'regHiveParser' }
    ]
}
