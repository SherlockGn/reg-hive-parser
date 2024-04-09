import { toNumber, part } from './util'
import parseCell from './cell'

export default (file, offset, number, recurse) => {
    if (offset < 0) {
        return null
    }

    offset += 4096

    const cells = []

    for (let i = 0; i < number; i++) {
        const keyValueOffset = toNumber(part(file, offset + i * 4, 4))
        const cell = recurse
            ? parseCell(file, keyValueOffset, recurse)
            : undefined

        cells.push({
            keyValueOffset,
            cell
        })
    }

    return cells
}
