export const part = (buffer, offset, length) => {
    return buffer.slice(offset, offset + length)
}

export const toArray = buffer => Array.from(new Uint8Array(buffer))

export const toAscii = buffer =>
    toArray(buffer)
        .map(v => String.fromCharCode(v))
        .join('')

export const toString = (buffer, encode = 'utf-16le') =>
    new TextDecoder(encode).decode(buffer)

export const toNumber = buffer => {
    const array = toArray(buffer)
    let s = 0
    for (let i = array.length - 1; i >= 0; i--) {
        s <<= 8
        s += array[i]
    }
    return s
}

export const toLargeNumber = buffer => {
    const array = toArray(buffer)
    let s = 0n
    for (let i = array.length - 1; i >= 0; i--) {
        s *= 256n
        s += BigInt(array[i])
    }
    return s
}

export const toGuid = buffer => {
    let array = toArray(buffer)
    array = array
        .slice(0, 4)
        .reverse()
        .concat(array.slice(4, 6).reverse())
        .concat(array.slice(6, 8).reverse())
        .concat(array.slice(8))

    return array
        .map(item => ('00' + item.toString(16).toUpperCase()).slice(-2))
        .join('')
        .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
}

export const toDate = buffer => {
    let n = toLargeNumber(buffer)
    n = Number(n / 10000n) - 11644473600000
    return new Date(n)
}
