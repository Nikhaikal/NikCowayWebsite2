// This receiver writes only to the specified Applications spreadsheet.
// Set APPLICATION_SECRET in Project Settings > Script properties.
// Deploy as a web app: Execute as Me; Who has access: Anyone.
function doPost(e) {
 const reply = value => ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
 const properties=PropertiesService.getScriptProperties();
 const lock=LockService.getScriptLock();
 try {
  const body=JSON.parse(e.postData.contents);
  const secret=properties.getProperty('APPLICATION_SECRET');
  if(!secret || body.secret!==secret)return reply({ok:false});
  const data=body.application;
  if(!data || typeof data.id!=='string' || !/^[a-zA-Z0-9-]{16,80}$/.test(data.id))return reply({ok:false});
  lock.waitLock(20000);
  const book=SpreadsheetApp.openById('1aiq98RHNjfbGrYTbV54ipnsCzb0jsN8Oe6oWSqWymnA');
  const sheet=book.getSheetByName('Applications') || book.insertSheet('Applications');
  if(sheet.getLastRow()===0)sheet.appendRow(['Submitted at','Application ID','Name','IC','Phone','Backup phone','Email','Installation address','Product','Language']);
  if(sheet.getLastRow()>1 && sheet.getRange(2,2,sheet.getLastRow()-1,1).createTextFinder(data.id).matchEntireCell(true).findNext())return reply({ok:true});
  // Keep leading zeroes, and treat customer input as text rather than formulas.
  const text=value=>{const s=String(value || '');return /^[=+\-@\t\r]/.test(s)?"'"+s:s;};
  const row=[data.submittedAt,data.id,data.name,data.ic,data.phone,data.backup,data.email,data.address,data.product,data.language].map(text);
  sheet.getRange(sheet.getLastRow()+1,1,1,row.length).setNumberFormat('@').setValues([row]);
  return reply({ok:true});
 }catch(error){return reply({ok:false});}
 finally{if(lock.hasLock())lock.releaseLock();}
}
