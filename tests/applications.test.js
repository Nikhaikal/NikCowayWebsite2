const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {application,saveApplication}=require('../lib/applications');
const input={id:'12345678-1234-1234-1234-123456789012',name:'Test & Name',ic:'001234567890',phone:'0123456789',backup:'',email:'test+site@example.com',address:'Line 1\nLine 2, 50%',product:'Penapis Air',language:'ms'};
test('WhatsApp message decodes once with readable whitespace and symbols',()=>{
 const source=fs.readFileSync(require.resolve('../script.js'),'utf8');
 const start=source.indexOf(' const values=[f.get("name")');const end=source.indexOf('\n window.open(url',start);
 const context={f:new Map(Object.entries(input)),labels:['Name','IC','Phone','Backup','Email','Address','Product'],intro:'Application',product:input.product,waUrl:msg=>'https://wa.me/60199881304?text='+encodeURIComponent(msg)};
 vm.createContext(context);vm.runInContext(source.slice(start,end)+'\nglobalThis.output=url;',context);
 const message=new URL(context.output).searchParams.get('text');
 assert.ok(message.includes('Name: Test & Name\n'));assert.ok(message.includes('Line 1\nLine 2, 50%'));assert.ok(!message.includes('%0A'));assert.ok(!message.includes('%20'));
});
test('validates application fields while preserving leading zeroes',()=>{
 const data=application(input);assert.equal(data.ic,input.ic);assert.equal(data.phone,input.phone);
 assert.throws(()=>application({...input,address:''}));assert.throws(()=>application({...input,phone:'no'}));
});
test('unconfigured Sheets never reports successful storage',async()=>{
 assert.equal((await saveApplication(application(input),{})).status,503);
});
test('Sheets success requires acknowledgement and keeps secret server-side',async()=>{
 const env={APPLICATIONS_WEBHOOK_URL:'https://script.google.com/macros/s/test/exec',APPLICATIONS_WEBHOOK_SECRET:'test-only'};
 const result=await saveApplication(application(input),env,async(url,opts)=>{
  const body=JSON.parse(opts.body);assert.equal(body.secret,'test-only');assert.equal(body.application.phone,input.phone);
  return {ok:true,json:async()=>({ok:true})};
 });assert.equal(result.status,201);
 for(const response of [{ok:false},{ok:true,json:async()=>({ok:false})}])assert.equal((await saveApplication(application(input),env,async()=>response)).status,502);
});
