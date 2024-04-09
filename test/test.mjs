import { parse } from '../dist/index.cjs'

const main = async () => {
    const parsed = await parse('./test/NTUSER-public.DAT', { recurse: true })
    console.log(parsed)
}

main()
