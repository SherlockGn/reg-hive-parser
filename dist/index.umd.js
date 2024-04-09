(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.regHiveParser = {}));
})(this, (function (exports) { 'use strict';

    const part = (buffer, offset, length) => {
        return buffer.slice(offset, offset + length)
    };

    const toArray = buffer => Array.from(new Uint8Array(buffer));

    const toAscii = buffer =>
        toArray(buffer)
            .map(v => String.fromCharCode(v))
            .join('');

    const toString = (buffer, encode = 'utf-16le') =>
        new TextDecoder(encode).decode(buffer);

    const toNumber = buffer => {
        const array = toArray(buffer);
        let s = 0;
        for (let i = array.length - 1; i >= 0; i--) {
            s <<= 8;
            s += array[i];
        }
        return s
    };

    const toLargeNumber = buffer => {
        const array = toArray(buffer);
        let s = 0n;
        for (let i = array.length - 1; i >= 0; i--) {
            s *= 256n;
            s += BigInt(array[i]);
        }
        return s
    };

    const toGuid = buffer => {
        let array = toArray(buffer);
        array = array
            .slice(0, 4)
            .reverse()
            .concat(array.slice(4, 6).reverse())
            .concat(array.slice(6, 8).reverse())
            .concat(array.slice(8));

        return array
            .map(item => ('00' + item.toString(16).toUpperCase()).slice(-2))
            .join('')
            .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
    };

    const toDate = buffer => {
        let n = toLargeNumber(buffer);
        n = Number(n / 10000n) - 11644473600000;
        return new Date(n)
    };

    var parseData = (file, offset, type, dataSize) => {
        if (offset < 0) {
            return null
        }

        offset += 4096;

        const size = Math.abs(toNumber(part(file, offset, 4)));
        let data = null;

        if (['REG_SZ', 'REG_EXPAND_SZ', 'REG_MULTI_SZ'].includes(type)) {
            data = toString(part(file, offset + 4, dataSize));
        } else if (type === 'REG_BINARY') {
            data = toArray(file.slice(offset + 4, offset + 4 + dataSize));
        } else {
            data = toNumber(part(file, offset, dataSize));
        }

        return {
            size,
            data
        }
    };

    var parseVk = (file, buffer, recurse) => {
        const nameLength = toNumber(part(buffer, 2, 2));
        let dataSize = toNumber(part(buffer, 4, 4));
        const msb = dataSize < 0;
        if (msb) {
            dataSize ^= 0x80000000;
        }
        const dataOffset = toNumber(part(buffer, 8, 4));
        const dataType = toNumber(part(buffer, 12, 4));
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
        ][dataType];
        let flags = toNumber(part(buffer, 16, 2));
        flags = {
            number: flags,
            valueCompName: !!(flags & 1),
            isTombstone: !!(flags & 2)
        };

        const spare = toNumber(part(buffer, 18, 2));
        const valueNameString = flags.valueCompName
            ? toAscii(part(buffer, 20, nameLength))
            : toString(part(buffer, 20, nameLength));

        let valueData = msb
            ? { size: dataSize, data: dataOffset }
            : recurse
            ? parseData(file, dataOffset, dataTypeName, dataSize)
            : undefined;

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
    };

    var parseValueList = (file, offset, number, recurse) => {
        if (offset < 0) {
            return null
        }

        offset += 4096;

        const cells = [];

        for (let i = 0; i < number; i++) {
            const keyValueOffset = toNumber(part(file, offset + i * 4, 4));
            const cell = recurse
                ? parseCell(file, keyValueOffset, recurse)
                : undefined;

            cells.push({
                keyValueOffset,
                cell
            });
        }

        return cells
    };

    const parseNkChildren = (file, nk, recurse, onetime = false) => {
        const subkeys =
            recurse || onetime
                ? parseCell(file, nk.subkeyListOffset, recurse)
                : undefined;
        const volatileSubkeys =
            recurse || onetime
                ? parseCell(file, nk.volatileSubkeyListOffset, recurse)
                : undefined;
        const keyValues =
            recurse || onetime
                ? parseValueList(
                      file,
                      nk.keyVauleListOffset,
                      nk.numberOfKeyValues,
                      recurse
                  )
                : undefined;

        return {
            subkeys,
            volatileSubkeys,
            keyValues
        }
    };

    const parseList = (file, offset, recurse, onetime = false) => {
        return recurse || onetime ? parseCell(file, offset, recurse) : undefined
    };

    const getChildren = (file, nkNode) => {
        const { subkeys, volatileSubkeys, keyValues } = parseNkChildren(
            file,
            nkNode,
            false,
            true
        );
        const subkeyCells = (subkeys?.cells ?? []).map(c =>
            parseList(file, c.keyNodeOffset ?? c.subkeyListOffset, false, true)
        );
        const volatileSubkeyCells = (volatileSubkeys?.cells ?? []).map(c =>
            parseList(file, c.keyNodeOffset ?? c.subkeyListOffset, false, true)
        );
        const keyValueCells = (keyValues ?? []).map(i => parseCell(file, i.keyValueOffset, false));
        
        return {
            subkeyCells,
            volatileSubkeyCells,
            keyValueCells: keyValueCells ?? []
        }
    };

    var parseNk = (file, buffer, recurse) => {
        let flags = toNumber(part(buffer, 2, 2));
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
        };

        const lastWritten = toDate(part(buffer, 4, 8));
        let accessBits = toNumber(part(buffer, 12, 4));
        accessBits = {
            number: accessBits,
            beforeInitialized: !!(accessBits & 1),
            afterInitialized: !!(accessBits & 2)
        };

        const parentOffset = toNumber(part(buffer, 16, 4));
        const numberOfSubKeys = toNumber(part(buffer, 20, 4));
        const numberOfVolatileSubKeys = toNumber(part(buffer, 24, 4));
        const subkeyListOffset = toNumber(part(buffer, 28, 4));
        const volatileSubkeyListOffset = toNumber(part(buffer, 32, 4));
        const numberOfKeyValues = toNumber(part(buffer, 36, 4));
        const keyVauleListOffset = toNumber(part(buffer, 40, 4));
        const keySecurityOffset = toNumber(part(buffer, 44, 4));
        const classNameOffset = toDate(part(buffer, 48, 4));
        const largestSubKeyNameLength = toNumber(part(buffer, 52, 2));

        const d = toNumber(part(buffer, 54, 1));
        let virtualControlFlags = d % 0b10000;
        virtualControlFlags = {
            number: virtualControlFlags,
            dontVirtualize: !!(virtualControlFlags & 2),
            dontSilentFail: !!(virtualControlFlags & 4),
            recurseFlag: !!(virtualControlFlags & 8)
        };
        let userFlags = d >> 4;
        userFlags = {
            number: userFlags,
            is32BitKey: !!(userFlags & 1),
            createdByReflectionProcess: !!(userFlags & 2),
            disableRegReflection: !!(userFlags & 4),
            disableRegReflectionIfExists: !!(userFlags & 8)
        };
        let debugFlags = toNumber(part(buffer, 55, 1));
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
        };

        const largestSubKeyClassLength = toNumber(part(buffer, 56, 4));
        const largestValueNameLength = toNumber(part(buffer, 60, 4));
        const largestValueDataSize = toNumber(part(buffer, 64, 4));
        const workVar = toNumber(part(buffer, 68, 4));

        const keyNameLength = toNumber(part(buffer, 72, 2));
        const classNameLength = toNumber(part(buffer, 74, 2));
        const keyNameString = flags.compName
            ? toAscii(part(buffer, 76, keyNameLength))
            : toString(part(buffer, 76, keyNameLength));

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
        };

        const extra = parseNkChildren(file, node, recurse);
        return { ...node, ...extra }
    };

    var parseLh = (file, buffer, recurse) => {
        const numberOfElements = toNumber(part(buffer, 2, 2));
        const cells = [];

        for (let i = 0; i < numberOfElements; i++) {
            const keyNodeOffset = toNumber(part(buffer, 4 + i * 8, 4));
            const nameHash = toNumber(part(buffer, 8 + i * 8, 4));
            const cell = parseList(file, keyNodeOffset, recurse);

            cells.push({
                keyNodeOffset,
                nameHash,
                cell
            });
        }

        return {
            numberOfElements,
            cells
        }
    };

    var parseLi = (file, buffer, recurse) => {
        const numberOfElements = toNumber(part(buffer, 2, 2));
        const cells = [];

        for (let i = 0; i < numberOfElements; i++) {
            const subkeyListOffset = toNumber(part(buffer, 4 + i * 4, 4));
            const cell = parseList(file, subkeyListOffset, recurse);

            cells.push({
                subkeyListOffset,
                cell
            });
        }

        return {
            numberOfElements,
            cells
        }
    };

    var parseLf = (file, buffer, recurse) => {
        const numberOfElements = toNumber(part(buffer, 2, 2));
        const cells = [];

        for (let i = 0; i < numberOfElements; i++) {
            const keyNodeOffset = toNumber(part(buffer, 4 + i * 8, 4));
            const nameHint = toAscii(part(buffer, 8 + i * 8, 4));
            const cell = parseList(file, keyNodeOffset, recurse);

            cells.push({
                keyNodeOffset,
                nameHint,
                cell
            });
        }

        return {
            numberOfElements,
            cells
        }
    };

    var parseRi = (file, buffer) => {
        const numberOfElements = toNumber(part(buffer, 2, 2));
        const cells = [];

        for (let i = 0; i < numberOfElements; i++) {
            const subkeyListOffset = toNumber(part(buffer, 4 + i * 4, 4));
            const cell = parseList(file, subkeyListOffset, recurse);

            cells.push({
                subkeyListOffset,
                cell
            });
        }

        return {
            numberOfElements,
            cells
        }
    };

    var parseCell = (buffer, offset, recurse) => {
        if (offset < 0) {
            return null
        }

        offset += 4096;

        const size = Math.abs(toNumber(part(buffer, offset, 4)));
        const cellData = buffer.slice(offset + 4, offset + size);

        const signature = toAscii(part(cellData, 0, 2));

        let parsed;
        if (signature === 'nk') {
            parsed = parseNk(buffer, cellData, recurse);
        }

        if (signature === 'lh') {
            parsed = parseLh(buffer, cellData, recurse);
        }

        if (signature === 'li') {
            parsed = parseLi(buffer, cellData, recurse);
        }

        if (signature === 'lf') {
            parsed = parseLf(buffer, cellData, recurse);
        }

        if (signature === 'ri') {
            parsed = parseRi(buffer, cellData);
        }

        if (signature === 'vk') {
            parsed = parseVk(buffer, cellData, recurse);
        }

        return {
            size,
            signature,
            ...parsed
        }
    };

    var parseBase = (file, recurse) => {
        const signature = toAscii(part(file, 0, 4));
        const primarySeqNum = toNumber(part(file, 4, 4));
        const secondarySeqNum = toNumber(part(file, 8, 4));
        const lastWritten = toDate(part(file, 12, 8));
        const majVer = toNumber(part(file, 20, 4));
        const minVer = toNumber(part(file, 24, 4));
        const fileType = toNumber(part(file, 28, 4));
        const fileFormat = toNumber(part(file, 32, 4));
        const rootCellOffset = toNumber(part(file, 36, 4));
        const hiveBinfileSize = toNumber(part(file, 40, 4));
        const clusteringFactor = toNumber(part(file, 44, 4));
        const fileName = toString(part(file, 48, 64));
        const checkSum = toNumber(part(file, 508, 4));
        const bootType = toNumber(part(file, 4088, 4));
        const bootRecover = toNumber(part(file, 4092, 4));

        const rmId = toGuid(part(file, 112, 16));
        const logId = toGuid(part(file, 128, 16));
        let flags = toNumber(part(file, 144, 4));
        flags = {
            number: flags,
            locked: !!(flags & 1),
            defragmented: !!(flags & 2)
        };

        const tmId = toGuid(part(file, 148, 16));
        const guidSignature = toAscii(part(file, 164, 4));
        const lastReorgTimestamp = toDate(part(file, 168, 8));
        const thawTmId = toGuid(part(file, 4040, 16));
        const thawRmId = toGuid(part(file, 4056, 16));
        const thawLogId = toGuid(part(file, 4072, 16));

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
        };

        const offreg = {
            signature: toAscii(part(file, 176, 4)),
            flags: toNumber(part(file, 180, 4)),
            serializationTimestamp: toDate(part(file, 512, 8))
        };

        const root = parseCell(file, rootCellOffset, recurse);

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
    };

    const getFileData = async path => {
        if (typeof window !== 'undefined') {
            throw new Error('not supported for browser to open a local file')
        }

        let fs = await import('fs');
        return fs.promises.readFile(path)
    };

    const parseChildren = (file, keyNode, opt) => {
        const { keyValueCells, subkeyCells, volatileSubkeyCells } = getChildren(
            file,
            keyNode
        );
        const children = [];
        for (const item of [
            ...keyValueCells,
            ...subkeyCells,
            ...volatileSubkeyCells
        ]) {
            if (item) {
                children.push(simplifyData(file, item, opt));
            }
        }

        return children
    };

    const parseValueData = (file, valueNode, opt) => {
        const d = parseData(
            file,
            valueNode.dataOffset,
            valueNode.dataTypeName,
            valueNode.dataSize
        );
        return simplifyData(file, d.data, opt)
    };

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
        let converted = null;
        if (obj.signature === 'nk') {
            converted = {
                type: 'key',
                name: obj.keyNameString,
                children: [],
                parse: () => parseChildren(file, obj, opt)
            };
            const subkeys = obj.subkeys?.cells ?? [];
            const volatileSubkeys = obj.volatileSubkeys?.cells ?? [];
            const keyValues = obj.keyValues ?? [];

            for (const item of [...subkeys, ...volatileSubkeys, ...keyValues]) {
                if (item.cell) {
                    converted.children.push(simplifyData(file, item.cell, opt));
                }
            }
        } else if (obj.signature === 'vk') {
            converted = {
                name: obj.valueNameString,
                type: 'value',
                valType: obj.dataTypeName,
                val: null,
                parse: () => parseValueData(file, obj, opt)
            };
            if (obj.valueData) {
                converted.val = simplifyData(file, obj.valueData.data, opt);
            }
        }

        let { extra } = opt;
        if (typeof extra !== 'function') {
            extra = () => undefined;
        }
        return {
            ...converted,
            extra: extra(obj)
        }
    };

    const parse = async (input, opt) => {
        let file = null;
        if (typeof input === 'string') {
            file = await getFileData(input);
        } else {
            file = input;
        }

        const { recurse = false, simplify = true } = opt;

        const parsed = parseBase(file, recurse);
        return simplify ? simplifyData(file, parsed, opt) : parsed
    };

    exports.parse = parse;

}));
