const test=require('node:test');
const assert=require('node:assert/strict');
const {sheetUrl,testimonials}=require('../lib/testimonials');
test('accepts published Google CSV only',()=>{
 assert.equal(sheetUrl(''),'');
 assert.ok(sheetUrl('https://docs.google.com/spreadsheets/d/e/abc/pub?output=csv'));
 for(const url of ['https://evil.test/file.csv','http://docs.google.com/spreadsheets/d/e/abc/pub?output=csv','https://docs.google.com/spreadsheets/d/abc/edit'])assert.throws(()=>sheetUrl(url));
});
test('parses quoted multiline captions, filters approval, excludes private columns',()=>{
 const result=testimonials('Name,State,Product,Caption,Photo,Approved,Phone\r\nRahman,Perak,NEON,"Great, thanks!\nSecond line",https://drive.google.com/file/d/abc123/view,Yes,0191234567\r\nHidden,KL,NEON,No,/assets/testimonials/test.jpg,No,123');
 assert.equal(result.length,1);assert.equal(result[0].caption,'Great, thanks!\nSecond line');
 assert.equal(result[0].image,'https://drive.google.com/thumbnail?id=abc123&sz=w1200');assert.ok(!('Phone' in result[0]));
});
test('requires schema and rejects unsafe image paths',()=>{
 assert.throws(()=>testimonials('Wrong,Columns\na,b'));
 assert.equal(testimonials('Name,State,Product,Caption,Photo,Approved\nA,B,C,D,javascript:alert(1),Yes').length,0);
 assert.equal(testimonials('Name,State,Product,Caption,Photo,Approved\nA,B,C,D,/assets/testimonials/a.jpg,Yes').length,1);
});

test('maps existing form headings without exposing internal fields',()=>{
 const rows=testimonials('nama cust,lokasi pemasangan,Produk,Caption,gambar hp dengan product dan customer,Approved,Email Address,hp code\nRahman,Perak,NEON,Terbaik,/assets/testimonials/a.jpg,Yes,private@example.com,123');
 assert.equal(rows[0].name,'Rahman');assert.equal(rows[0].state,'Perak');assert.equal(rows[0].product,'NEON');assert.equal(Object.keys(rows[0]).length,5);
});

test('reads the supplied five-column HYPEHAUS feed including rows without a product',()=>{
 const rows=testimonials('Name,Location,Produk,Caption,Photo\nCustomer,Perak,,,/assets/testimonials/photo.jpg');
 assert.equal(rows.length,1);assert.equal(rows[0].state,'Perak');assert.equal(rows[0].product,'');
 assert.equal(testimonials('Name,Location,Produk,Caption,Photo,Approved\nCustomer,Perak,,,/assets/testimonials/photo.jpg,No').length,0);
});
