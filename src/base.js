import { toNumber, part, toAscii, toString, toDate, toGuid } from './util'
import parseCell from './cell'

export default (file, recurse) => {
    const signature = toAscii(part(file, 0, 4))
    const primarySeqNum = toNumber(part(file, 4, 4))
    const secondarySeqNum = toNumber(part(file, 8, 4))
    const lastWritten = toDate(part(file, 12, 8))
    const majVer = toNumber(part(file, 20, 4))
    const minVer = toNumber(part(file, 24, 4))
    const fileType = toNumber(part(file, 28, 4))
    const fileFormat = toNumber(part(file, 32, 4))
    const rootCellOffset = toNumber(part(file, 36, 4))
    const hiveBinfileSize = toNumber(part(file, 40, 4))
    const clusteringFactor = toNumber(part(file, 44, 4))
    const fileName = toString(part(file, 48, 64))
    const checkSum = toNumber(part(file, 508, 4))
    const bootType = toNumber(part(file, 4088, 4))
    const bootRecover = toNumber(part(file, 4092, 4))

    const rmId = toGuid(part(file, 112, 16))
    const logId = toGuid(part(file, 128, 16))
    let flags = toNumber(part(file, 144, 4))
    flags = {
        number: flags,
        locked: !!(flags & 1),
        defragmented: !!(flags & 2)
    }

    const tmId = toGuid(part(file, 148, 16))
    const guidSignature = toAscii(part(file, 164, 4))
    const lastReorgTimestamp = toDate(part(file, 168, 8))
    const thawTmId = toGuid(part(file, 4040, 16))
    const thawRmId = toGuid(part(file, 4056, 16))
    const thawLogId = toGuid(part(file, 4072, 16))

    const newFields = {
        rmId,
        logId,
        flags,
        tmId,
        guidSignature,
        lastReorgTimestamp,
        thawTmId,
        thawRmId,
        thawLogId
    }

    const offreg = {
        signature: toAscii(part(file, 176, 4)),
        flags: toNumber(part(file, 180, 4)),
        serializationTimestamp: toDate(part(file, 512, 8))
    }

    const root = parseCell(file, rootCellOffset, recurse)

    return {
        signature,
        primarySeqNum,
        secondarySeqNum,
        lastWritten,
        majVer,
        minVer,
        fileType,
        fileFormat,
        rootCellOffset,
        hiveBinfileSize,
        clusteringFactor,
        fileName,
        checkSum,
        bootType,
        bootRecover,

        newFields,

        offreg,

        root
    }
}
