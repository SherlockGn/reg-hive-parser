import parseCell from './cell'
import parseVk from './vk'
import parseValueList from './valueList'

export const parseNkChildren = (file, nk, recurse, onetime = false) => {
    const subkeys =
        recurse || onetime
            ? parseCell(file, nk.subkeyListOffset, recurse)
            : undefined
    const volatileSubkeys =
        recurse || onetime
            ? parseCell(file, nk.volatileSubkeyListOffset, recurse)
            : undefined
    const keyValues =
        recurse || onetime
            ? parseValueList(
                  file,
                  nk.keyVauleListOffset,
                  nk.numberOfKeyValues,
                  recurse
              )
            : undefined

    return {
        subkeys,
        volatileSubkeys,
        keyValues
    }
}

export const parseList = (file, offset, recurse, onetime = false) => {
    return recurse || onetime ? parseCell(file, offset, recurse) : undefined
}

export const getChildren = (file, nkNode) => {
    const { subkeys, volatileSubkeys, keyValues } = parseNkChildren(
        file,
        nkNode,
        false,
        true
    )
    const subkeyCells = (subkeys?.cells ?? []).map(c =>
        parseList(file, c.keyNodeOffset ?? c.subkeyListOffset, false, true)
    )
    const volatileSubkeyCells = (volatileSubkeys?.cells ?? []).map(c =>
        parseList(file, c.keyNodeOffset ?? c.subkeyListOffset, false, true)
    )
    const keyValueCells = (keyValues ?? []).map(i => parseCell(file, i.keyValueOffset, false, true))
    
    return {
        subkeyCells,
        volatileSubkeyCells,
        keyValueCells: keyValueCells ?? []
    }
}
