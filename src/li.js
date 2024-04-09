import { toNumber, part } from './util'
import { parseList } from './lazy'

export default (file, buffer, recurse) => {
    const numberOfElements = toNumber(part(buffer, 2, 2))
    const cells = []

    for (let i = 0; i < numberOfElements; i++) {
        const subkeyListOffset = toNumber(part(buffer, 4 + i * 4, 4))
        const cell = parseList(file, subkeyListOffset, recurse)

        cells.push({
            subkeyListOffset,
            cell
        })
    }

    return {
        numberOfElements,
        cells
    }
}
