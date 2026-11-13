/* SOA accounting core: no UI or existing FieldForce module modifications.
   All money is calculated in integer sen to avoid floating-point drift. */
(function(root){
'use strict';
const cents=v=>{if(v===null||v===undefined||v==='')return 0;const s=String(v).trim().replace(/,/g,'');if(!/^-?\d+(\.\d{1,2})?$/.test(s))throw Error('Invalid RM amount: '+v);const neg=s.startsWith('-');const [whole,fraction='']=s.replace('-','').split('.');const amount=Number(whole)*100+Number((fraction+'00').slice(0,2));if(!Number.isSafeInteger(amount))throw Error('Amount exceeds safe range');return neg?-amount:amount;};
const rm=v=>(v/100).toFixed(2);
const dateKey=s=>{const v=String(s||'').trim();let iso=v;if(/^\d{2}\/\d{2}\/\d{4}$/.test(v)){const [d,m,y]=v.split('/');iso=y+'-'+m+'-'+d;}if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))throw Error('Invalid date: '+v);const [y,m,d]=iso.split('-').map(Number);const days=new Date(Date.UTC(y,m,0)).getUTCDate();if(y<1900||y>9999||m<1||m>12||d<1||d>days)throw Error('Invalid calendar date: '+v);return iso;};
function statement(entries,{from,to,opening='0.00'}={}){
 const start=from?dateKey(from):'0000-01-01',end=to?dateKey(to):'9999-12-31';
 if(start>end)throw Error('From Date must not exceed To Date');
 let balance=cents(opening),openingBalance=balance;
 const ordered=entries.map((e,i)=>({...e,_i:i,_date:dateKey(e.date)})).sort((a,b)=>a._date.localeCompare(b._date)||a._i-b._i);
 const rows=[];
 for(const e of ordered){const debit=cents(e.debit),credit=cents(e.credit);if(debit<0||credit<0)throw Error('Debit and Credit cannot be negative');if(debit&&credit)throw Error('One transaction cannot have both Debit and Credit');
  if(e._date>end)continue;
  balance+=debit-credit;if(!Number.isSafeInteger(balance))throw Error('Balance exceeds safe range');
  if(e._date<start){openingBalance=balance;continue;}
  rows.push({id:e.id||'',date:e.date,description:String(e.description||''),reference:String(e.reference||''),debit:rm(debit),credit:rm(credit),balance:rm(balance),balanceCents:balance,sourceIndex:e._i});
 }
 return {openingBalance:rm(openingBalance),closingBalance:rm(balance),rows,totalDebit:rm(rows.reduce((a,r)=>a+cents(r.debit),0)),totalCredit:rm(rows.reduce((a,r)=>a+cents(r.credit),0))};
}
function csv(rows){const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return '\ufeff'+[['Date','Description','Reference','Debit','Credit','Balance'],...rows.map(r=>[r.date,r.description,r.reference,r.debit,r.credit,r.balance])].map(row=>row.map(quote).join(',')).join('\r\n');}
root.FFH_SOA_CORE=Object.freeze({cents,rm,dateKey,statement,csv});
})(typeof window!=='undefined'?window:globalThis);
