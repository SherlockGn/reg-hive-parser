# Reg Hive Parser

## Introduction

**Reg Hive Parser** is an entirely JavaScript-based tool for parsing Windows Registry hive files, such as the NTUSER.dat file in the user prfiles, enhancing the security of the analysis process. The tool does not rely on any third-party libraries as dependencies. You can involve it in Node.js by using CommonJS or ESM. Furthermore, it is compatible with web browsers. To get a firsthand experience, simply click [here](www.example.com).

The parser is implemented based on this [format specification](https://github.com/msuhanov/regf/tree/master). We appreciate the hard work and dedication of the author, whose efforts have made this project possible.

## Installation

```
npm install reg-hive-parser
```

## Usage

### CJS

```javascript
const { parse } = require('reg-hive-parser')

(async () => {
    const parsed = await parse('path/to/hive.dat', { recurse: true })
    console.log(parsed)
})()
```

### ESM
```javascript
import { parse } from 'reg-hive-parser'

(async () => {
    const parsed = await parse('path/to/hive.dat', { recurse: true })
    console.log(parsed)
})()
```

### Browser
```html
<input type="file" />
<script src="../dist/index.umd.js"></script>
<script>
    const { parse } = regHiveParser
    const input = document.querySelector('input')
    input.addEventListener('change', e => {
        const file = e.target.files[0]
        const reader = new FileReader()
        reader.onload = async e => {
            const parsed = await parse(e.target.result, {
                recurse: false
            })
            console.log(parsed)
        }
        reader.readAsArrayBuffer(file)
    })
<script>
```

## API

### async parse(buffer, options)

Parses a Windows Registry hive file and returns a parsed object.

#### buffer

Type: `String`, `ArrayBuffer` (browser) or `Buffer` (nodejs)

If the argument is a `String` type, it represents the path of the hive file. Please note that this functionality is not supported in web browsers.
If the argument is an `ArrayBuffer` (for browsers) or a `Buffer` (for Node.js), it corresponds to the content of the file data.

#### options

Type: `Object`
    
##### recurse

Type: `Boolean`

Default: `false`

If `true`, the parser will recursively parse subkeys. To efficiently parse large hive files, we recommend setting the `recurse` parameter to `false` in order to minimize latency.

##### simplify

Type: `Boolean`

Default: `true`

If set `false`, the parser returns the raw parsed object of each node. Here is the example.

```json
{
  "signature": "regf",
  "primarySeqNum": 1446218,
  "secondarySeqNum": 1446218,
  "majVer": 1,
  "minVer": 5,
  "fileType": 0,
  "fileFormat": 1,
  "rootCellOffset": 32,
  "root": {
    "size": 88,
    "signature": "nk",
    "keyNameLength": 4,
    "classNameLength": 0,
    "keyNameString": "ROOT",
    "virtualControlFlags": {
      "number": 0,
      "dontVirtualize": false,
      "dontSilentFail": false,
      "recurseFlag": false
    }
    // ...
  },
  // ...
}
```
    
If set `true`, the parser simplifies the parsed object. Here is the example.

```json
{
  "base": {
    "signature": "regf",
    "primarySeqNum": 1446218,
    "secondarySeqNum": 1446218,
    // ...
  },
  "root": {
    "type": "key",
    "name": "root",
    "children": [
      {
        "type": "key",
        "name": "AppEvents",
        "children": [
          // ...
        ]
      },
      {
        "type": "value",
        "name": "",
        "valType": "REG_SZ",
        "val": "Default Beep"
      }
      // ...
    ]
  }
}
```

Note: if the `recurse` parameter is set to `false` and the `simplify` parameter is set to `true`, the following behavior is observed:

1. For each simplified key node, the `children` property will always be an empty array.
2. For each simplified value node, the `val` property will always be `null`.
3. Each node will include a `parse` function.
4. Invoking the `parse` function on a key node will return the children of the key.
5. Invoking the `parse` function on a value node will return the data content of the value.

#### extra

Type: `Function`
    
Default: `() => undefined`

You have the flexibility to add any property that you are interested in to the simplified object. This allows you to include additional information or customize the structure according to your specific needs. By extending the simplified object, you can enhance its functionality and tailor it to suit your requirements. Here is the example.

```javascript
await parse(e.target.result, {
    recurse: false,
    simplify: true,
    extra: raw => ({ signature: raw.signature })
})
```

This will add the `signature` property to each simplified object.
    
```json
{
  "base": {
    // ...
  },
  "root": {
    "extra": {
        "signature": "nk"
    },
    "type": "key",
    "name": "root",
    "children": [
      {
        "extra": {
            "signature": "nk"
        },
        "type": "key",
        "name": "AppEvents",
        "children": [
          // ...
        ]
      },
      {
        "extra": {
            "signature": "vk"
        },
        "type": "value",
        "name": "",
        "valType": "REG_SZ",
        "val": "Default Beep"
      }
      // ...
    ]
  }
}
```

## Lisence

This project is licensed under the MIT license.
