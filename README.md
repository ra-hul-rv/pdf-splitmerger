Compatibility: Node.js and all major browsers.

Install with `npm`:

```sh
npm install pdf-splitmerger
```

## API

### `pdfSplitMerge` (base64 encode)

```js
const { pdfSplitMerge } = require("pdf-splitmerger");
//config eg: '1-4,7-8,9' meaning merge the given pages and split the rest into new pdf files
// a file with 9 pages and if you pass the above string which will be converted to [[1,4],[7,8],[9]] this means the pages from 1-4 will be one pdf file and 7-8 will be another pdf  file and 9 will be seperated
//eg: '1' ,'1-2' etc
const config = "1,2";
const resultArray = pdfSplitMerge(file, config);
```
