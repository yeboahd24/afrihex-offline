# @afrihex/offline

Create and read [AfriHex](https://developer.afrihex.com) location codes on the
device, with **no internet**. Codes match the AfriHex API exactly.

Useful where coverage is poor: riders, field and health workers, surveys and
village deliveries. A phone's GPS works without data, and the share message
works over a plain text message.

```ts
import { encode, decode, shortCode, shareMessage } from '@afrihex/offline'

encode(5.6221843, -0.1729361, 7)        // 'AF-GH-7-0GXTJJBDZZZZZ'
shortCode('AF-GH-7-0GXTJJBDZZZZZ')     // 'AF-GH-7-0GXTJJBD'
decode('AF-GH-7-0GXTJJBD')             // { lat, lng, level: 7, boundary, areaM2, ... }

// From a GPS reading: the level follows the accuracy (±8 m gives level 13).
const m = shareMessage({ lat: 5.63194, lng: -0.13998, accuracyM: 8, at: new Date(), label: 'Ama' })
m.text
// Ama: AfriHex AF-GH-13-…
// 5.63194, -0.13998 (±8 m) at 14:05
// https://maps.google.com/?q=5.63194,-0.13998
```

## Choosing a level

| Level | Cell size | Use for |
|---|---|---|
| 7 | about 2 km across | a neighbourhood (the API's default) |
| 10 | about 130 m | a few streets |
| 12 | about 20 m | a compound or building |
| 13 | about 7 m | a gate |

`levelForAccuracy(metres)` picks the finest level the GPS reading supports, so
a code never claims more precision than the phone has. `shareMessage` marks
readings worse than 50 m as rough and asks the person to describe where they
are.

## What needs the API

Only the code maths is offline. Converting to and from GhanaPostGPS codes,
landmark directions ("Opposite Shell filling station"), gates, building
snapping and routing need [the AfriHex API](https://developer.afrihex.com).

## Format

See [SPEC.md](./SPEC.md). `test/vectors.json` holds reference codes from the
API; `npm test` checks this library against them.

## Licence

MIT. See [LICENSE](./LICENSE).
