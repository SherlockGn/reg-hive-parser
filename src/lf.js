import { toNumber, part, toAscii } from './util'
import { parseList } from './lazy'

export default (file, buffer, recurse) => {
    const numberOfElements = toNumber(part(buffer, 2, 2))
    const cells = []

    for (let i = 0; i < numberOfElements; i++) {
        const keyNodeOffset = toNumber(part(buffer, 4 + i * 8, 4))
        const nameHint = toAscii(part(buffer, 8 + i * 8, 4))
        const cell = parseList(file, keyNodeOffset, recurse)

        cells.push({
            keyNodeOffset,
            nameHint,
            cell
        })
    }

    return {
        numberOfElements,
        cells
    }
}
