import { toNumber, toAscii, part } from './util'
import parseNk from './nk'
import parseLh from './lh'
import parseLi from './li'
import parseLf from './lf'
import parseRi from './ri'
import parseVk from './vk'

export default (buffer, offset, recurse) => {
    if (offset < 0) {
        return null
    }

    offset += 4096

    const size = Math.abs(toNumber(part(buffer, offset, 4)))
    const cellData = buffer.slice(offset + 4, offset + size)

    const signature = toAscii(part(cellData, 0, 2))

    let parsed
    if (signature === 'nk') {
        parsed = parseNk(buffer, cellData, recurse)
    }

    if (signature === 'lh') {
        parsed = parseLh(buffer, cellData, recurse)
    }

    if (signature === 'li') {
        parsed = parseLi(buffer, cellData, recurse)
    }

    if (signature === 'lf') {
        parsed = parseLf(buffer, cellData, recurse)
    }

    if (signature === 'ri') {
        parsed = parseRi(buffer, cellData, recurse)
    }

    if (signature === 'vk') {
        parsed = parseVk(buffer, cellData, recurse)
    }

    return {
        size,
        signature,
        ...parsed
    }
}
