import { toNumber, toDate, toAscii, toString, part } from './util'
import { parseNkChildren } from './lazy'

export default (file, buffer, recurse) => {
    let flags = toNumber(part(buffer, 2, 2))
    flags = {
        number: flags,
        volatile: !!(flags & 1),
        hiveExit: !!(flags & 2),
        hiveEntry: !!(flags & 4),
        noDelete: !!(flags & 8),
        symLink: !!(flags & 16),
        compName: !!(flags & 32),
        predefHandle: !!(flags & 64),
        virtualSource: !!(flags & 128),
        virtualTarget: !!(flags & 256),
        virtualStore: !!(flags & 512)
    }

    const lastWritten = toDate(part(buffer, 4, 8))
    let accessBits = toNumber(part(buffer, 12, 4))
    accessBits = {
        number: accessBits,
        beforeInitialized: !!(accessBits & 1),
        afterInitialized: !!(accessBits & 2)
    }

    const parentOffset = toNumber(part(buffer, 16, 4))
    const numberOfSubKeys = toNumber(part(buffer, 20, 4))
    const numberOfVolatileSubKeys = toNumber(part(buffer, 24, 4))
    const subkeyListOffset = toNumber(part(buffer, 28, 4))
    const volatileSubkeyListOffset = toNumber(part(buffer, 32, 4))
    const numberOfKeyValues = toNumber(part(buffer, 36, 4))
    const keyVauleListOffset = toNumber(part(buffer, 40, 4))
    const keySecurityOffset = toNumber(part(buffer, 44, 4))
    const classNameOffset = toDate(part(buffer, 48, 4))
    const largestSubKeyNameLength = toNumber(part(buffer, 52, 2))

    const d = toNumber(part(buffer, 54, 1))
    let virtualControlFlags = d % 0b10000
    virtualControlFlags = {
        number: virtualControlFlags,
        dontVirtualize: !!(virtualControlFlags & 2),
        dontSilentFail: !!(virtualControlFlags & 4),
        recurseFlag: !!(virtualControlFlags & 8)
    }
    let userFlags = d >> 4
    userFlags = {
        number: userFlags,
        is32BitKey: !!(userFlags & 1),
        createdByReflectionProcess: !!(userFlags & 2),
        disableRegReflection: !!(userFlags & 4),
        disableRegReflectionIfExists: !!(userFlags & 8)
    }
    let debugFlags = toNumber(part(buffer, 55, 1))
    debugFlags = {
        number: debugFlags,
        breakOnOpen: !!(debugFlags & 1),
        breakOnDelete: !!(debugFlags & 2),
        breakOnSecurityChange: !!(debugFlags & 4),
        breakOnCreateSubKey: !!(debugFlags & 8),
        breakOnDeleteSubKey: !!(debugFlags & 16),
        breakOnSetValue: !!(debugFlags & 32),
        breakOnDeleteValue: !!(debugFlags & 64),
        breakOnKeyVirtualize: !!(debugFlags & 128)
    }

    const largestSubKeyClassLength = toNumber(part(buffer, 56, 4))
    const largestValueNameLength = toNumber(part(buffer, 60, 4))
    const largestValueDataSize = toNumber(part(buffer, 64, 4))
    const workVar = toNumber(part(buffer, 68, 4))

    const keyNameLength = toNumber(part(buffer, 72, 2))
    const classNameLength = toNumber(part(buffer, 74, 2))
    const keyNameString = flags.compName
        ? toAscii(part(buffer, 76, keyNameLength))
        : toString(part(buffer, 76, keyNameLength))

    const node = {
        flags,
        lastWritten,
        accessBits,
        parentOffset,
        numberOfSubKeys,
        numberOfVolatileSubKeys,
        subkeyListOffset,
        volatileSubkeyListOffset,
        numberOfKeyValues,
        keyVauleListOffset,
        keySecurityOffset,
        classNameOffset,
        largestSubKeyNameLength,
        largestSubKeyClassLength,
        largestValueNameLength,
        largestValueDataSize,
        workVar,
        keyNameLength,
        classNameLength,
        keyNameString,
        virtualControlFlags,
        userFlags,
        debugFlags
    }

    const extra = parseNkChildren(file, node, recurse)
    return { ...node, ...extra }
}
