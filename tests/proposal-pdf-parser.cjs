const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const window={};
vm.runInNewContext(fs.readFileSync('proposal-pdf-extractor.js','utf8'),{window,document:{},setTimeout,clearTimeout,console},{filename:'proposal-pdf-extractor.js'});
const parser=window.FFH_PROPOSAL_PDF_PARSE;
assert.ok(parser);
const sample=['No. Item Code Product Name Balance Stock Proposed Order',...Array.from({length:9},(_,i)=>(i+1)+' '+(105641+i)+' PRAN Test Biscuits '+(50+i)+'g')];
const extracted=parser.extractFromLines(sample);
assert.equal(extracted.lines.length,9);
assert.equal(extracted.lines[0].code,'105641');
assert.equal(extracted.lines[0].name,'PRAN Test Biscuits 50g');
assert.equal(extracted.confidence,'high');
assert.equal(parser.extractFromLines(['Supplier 60120000000','Date 2026-10-29','Outlet code XXXXX']).lines.length,0);
const rows=parser.itemRows([
 {str:'1',transform:[1,0,0,1,10,400]},
 {str:'105641',transform:[1,0,0,1,44,400]},
 {str:'PRAN Test Biscuits 50g',transform:[1,0,0,1,130,400]},
 {str:'2',transform:[1,0,0,1,10,380]},
 {str:'105642',transform:[1,0,0,1,44,380]},
 {str:'PRAN Test Biscuits 51g',transform:[1,0,0,1,130,380]}
]);
assert.equal(parser.extractFromLines(['Item Code Product Name',...rows]).lines.length,2);
console.log('PASS PDF proposal SKU parser: 9 fixed items, correct codes, independent PDF columns, no fabricated fields');
