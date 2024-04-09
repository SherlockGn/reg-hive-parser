import { toNumber, toAscii, toString, part } from './util'
import parseData from './data'

export default (file, buffer, recurse) => {
    const nameLength = toNumber(part(buffer, 2, 2))
    let dataSize = toNumber(part(buffer, 4, 4))
    const msb = dataSize < 0
    if (msb) {
        dataSize ^= 0x80000000
    }
    const dataOffset = toNumber(part(buffer, 8, 4))
    const dataType = toNumber(part(buffer, 12, 4))
    const dataTypeName = [
        'REG_NONE',
        'REG_SZ',
        'REG_EXPAND_SZ',
        'REG_BINARY',
        'REG_DWORD',
        'REG_DWORD_BIG_ENDIAN',
        'REG_LINK',
        'REG_MULTI_SZ',
        'REG_RESOURCE_LIST',
        'REG_FULL_RESOURCE_DESCRIPTOR',
        'REG_RESOURCE_REQUIREMENTS_LIST',
        'REG_QWORD'
    ][dataType]
    let flags = toNumber(part(buffer, 16, 2))
    flags = {
        number: flags,
        valueCompName: !!(flags & 1),
        isTombstone: !!(flags & 2)
    }

    const spare = toNumber(part(buffer, 18, 2))
    const valueNameString = flags.valueCompName
        ? toAscii(part(buffer, 20, nameLength))
        : toString(part(buffer, 20, nameLength))

    let valueData = msb
        ? { size: dataSize, data: dataOffset }
        : recurse
        ? parseData(file, dataOffset, dataTypeName, dataSize, recurse)
        : undefined

    return {
        nameLength,
        dataSize,
        dataOffset,
        dataType,
        dataTypeName,
        flags,
        spare,
        valueNameString,
        valueData
    }
}
