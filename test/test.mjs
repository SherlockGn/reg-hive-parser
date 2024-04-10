import { parse } from '../dist/index-esm.mjs'

const main = async () => {
    const parsed = await parse('./test/NTUSER-public.DAT', { recurse: true })
    console.log(parsed)
}

main()
