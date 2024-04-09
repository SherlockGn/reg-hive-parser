import { toNumber, toString, toArray, part } from "./util"

export default (file, offset, type, dataSize) => {
    if (offset < 0) {
        return null
    }

    offset += 4096

    const size = Math.abs(toNumber(part(file, offset, 4)))
    let data = null

    if (['REG_SZ', 'REG_EXPAND_SZ', 'REG_MULTI_SZ'].includes(type)) {
        data = toString(part(file, offset + 4, dataSize))
    } else if (type === 'REG_BINARY') {
        data = toArray(file.slice(offset + 4, offset + 4 + dataSize))
    } else {
        data = toNumber(part(file, offset, dataSize))
    }

    return {
        size,
        data
    }
}
