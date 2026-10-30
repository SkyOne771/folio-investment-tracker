import {hasXtbCashTable} from './xtb.js';
// Read only files explicitly selected in the browser; never walk outside that selection.
export async function scanXtbSelection(selection,readFile,{isCurrent=()=>true,onProgress=()=>{}}={}){
 const files=Array.from(selection),candidates=files.filter(f=>/\.(xlsx|csv)$/i.test(f.name)&&!f.name.startsWith('~$'));
 if(candidates.length>50)throw Error('Choose at most 50 XLSX/CSV files at a time. Select a smaller folder.');
 if(candidates.reduce((sum,f)=>sum+f.size,0)>50_000_000)throw Error('Selected statements exceed 50 MB. Choose a smaller batch.');
 const entries=[],skipped=[];let rows=0;
 for(const file of files){if(!candidates.includes(file))skipped.push({name:file.webkitRelativePath||file.name,reason:'Unsupported file or temporary Excel file.'});}
 for(let index=0;index<candidates.length;index++){
  if(!isCurrent())return {cancelled:true,entries:[],skipped:[]};
  const file=candidates[index],name=file.webkitRelativePath||file.name;onProgress({index:index+1,total:candidates.length,name});
  try{const loaded=await readFile(file);if(!isCurrent())return {cancelled:true,entries:[],skipped:[]};
   const count=loaded.sheets.reduce((n,s)=>n+s.data.length,0);if(rows+count>150000)throw Error('Batch row limit reached (150,000 rows). Import this file in a separate batch.');
   if(!hasXtbCashTable(loaded.sheets))throw Error('No XTB Cash Operations table found.');
   rows+=count;entries.push({loaded,displayName:name,status:'pending',options:{accountType:loaded.metadata.accountType||'',accountRef:loaded.metadata.accountRef||'',currency:loaded.metadata.currency||'',mappings:{}}});
  }catch(e){skipped.push({name,reason:e.message||'Could not read this file.'});}
 }
 return {entries,skipped,cancelled:false};
}
