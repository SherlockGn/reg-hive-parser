import parseBase from './base'
import { getChildren } from './lazy'
import parseData from './data'

const getFileData = async path => {
    if (typeof window !== 'undefined') {
        throw new Error('not supported for browser to open a local file')
    }

    let fs = null
    if (require) {
        fs = require('fs')
    } else {
        fs = await import('fs')
    }

    return fs.promises.readFile(path)
}

const parseChildren = (file, keyNode, opt) => {
    const { keyValueCells, subkeyCells, volatileSubkeyCells } = getChildren(
        file,
        keyNode
    )
    const children = []
    for (const item of [
        ...keyValueCells,
        ...subkeyCells,
        ...volatileSubkeyCells
    ]) {
        if (item) {
            children.push(simplifyData(file, item, opt))
        }
    }

    return children
}

const parseValueData = (file, valueNode, opt) => {
    const d = parseData(
        file,
        valueNode.dataOffset,
        valueNode.dataTypeName,
        valueNode.dataSize
    )
    return simplifyData(file, d.data, opt)
}

const simplifyData = (file, obj, opt) => {
    if (typeof obj === 'number' || Array.isArray(obj)) {
        return obj
    }
    if (typeof obj === 'string') {
        if (obj.endsWith('\x00')) {
            return obj.substring(0, obj.length - 1)
        } else {
            return obj
        }
    }
    if (obj.root) {
        return {
            root: simplifyData(file, obj.root, opt),
            base: {
                ...obj,
                root: undefined
            }
        }
    }
    let converted = null
    if (obj.signature === 'nk') {
        converted = {
            type: 'key',
            name: obj.keyNameString,
            children: [],
            parse: () => parseChildren(file, obj, opt)
        }
        const subkeys = obj.subkeys?.cells ?? []
        const volatileSubkeys = obj.volatileSubkeys?.cells ?? []
        const keyValues = obj.keyValues ?? []

        for (const item of [...subkeys, ...volatileSubkeys, ...keyValues]) {
            if (item.cell) {
                converted.children.push(simplifyData(file, item.cell, opt))
            }
        }
    } else if (obj.signature === 'vk') {
        converted = {
            name: obj.valueNameString,
            type: 'value',
            valType: obj.dataTypeName,
            val: null,
            parse: () => parseValueData(file, obj, opt)
        }
        if (obj.valueData) {
            converted.val = simplifyData(file, obj.valueData.data, opt)
        }
    }

    let { extra } = opt
    if (typeof extra !== 'function') {
        extra = () => undefined
    }
    return {
        ...converted,
        extra: extra(obj)
    }
}

export const parse = async (input, opt) => {
    let file = null
    if (typeof input === 'string') {
        file = await getFileData(input)
    } else {
        file = input
    }

    opt = { ...opt }
    const { recurse = false, simplify = true } = opt

    const parsed = parseBase(file, recurse)
    return simplify ? simplifyData(file, parsed, opt) : parsed
}
