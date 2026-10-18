(function(root){
 'use strict';
 const wants=q=>/(focus|ফোকাস|low.?sales?|কম.*(?:সেল|বিক্রি|sku|এসকিউ|এসকেইউ)|bottom.*outlet|slow.*(?:outlet|market)|কোন.*(?:মার্কেট|বাজার|আউটলেট)|which.*(?:outlet|market)|zero.?sales?|জিরো.*সেল|শূন্য.*সেল)/i.test(q);
 function answer({question,ids,outlets,sales,month,today,staff}){
  if(!wants(question))return null;
  const bn=/[\u0980-\u09ff]/.test(question),allowed=new Set(ids),rows=new Map();
  const key=(id,code)=>JSON.stringify([id,String(code||'').trim()]);
  for(const o of outlets){if(!allowed.has(o.sr_id)||o.active===false)continue;const k=key(o.sr_id,o.outlet_code);if(!rows.has(k))rows.set(k,{id:o.sr_id,code:o.outlet_code,name:o.outlet_name||o.outlet_code,total:Number(o.total_sku)||0,amount:0,pending:0,skus:new Set(),last:''});}
  for(const s of sales){if(!allowed.has(s.sr_id)||!String(s.sale_date).startsWith(month)||s.sale_date>today)continue;const r=rows.get(key(s.sr_id,s.outlet_code));if(!r)continue;
   if(s.status==='Delivered'&&Number(s.delivered_amount)>0){r.amount+=Number(s.delivered_amount);if(Number(s.qty)>0&&String(s.sku||'').trim())r.skus.add(String(s.sku).normalize('NFKC').trim().toLowerCase());r.last=r.last>s.sale_date?r.last:s.sale_date;}
   else if(s.status==='Pending Delivery')r.pending+=Math.max(0,Number(s.order_amount)||0);
  }
  const skuQuery=/(sku|এসকিউ|এসকেইউ)/i.test(question),zeroQuery=/(zero.?sales?|জিরো.*সেল|শূন্য.*সেল)/i.test(question);
  let ranked=[...rows.values()];if(zeroQuery)ranked=ranked.filter(r=>r.amount===0);
  ranked.sort((a,b)=>(Number(a.amount>0)-Number(b.amount>0))||(skuQuery?a.skus.size-b.skus.size:0)||a.amount-b.amount||a.skus.size-b.skus.size||String(a.name).localeCompare(String(b.name))||String(a.id).localeCompare(String(b.id)));
  if(!ranked.length)return bn?(zeroQuery?'এই নির্বাচিত scope-এ চলতি মাসে zero-sale outlet নেই।':'এই নির্বাচিত scope-এ active outlet assignment পাইনি; outlet-এর নাম বানিয়ে বলছি না।'):(zeroQuery?'No zero-sales outlets in the selected scope this month.':'No active outlet assignments were found in the selected scope.');
  const periodRows=sales.filter(s=>allowed.has(s.sr_id)&&String(s.sale_date).startsWith(month)&&s.sale_date<=today);
  const noData=periodRows.length===0;
  const money=v=>'RM '+v.toFixed(2),zero=[...rows.values()].filter(r=>r.amount===0).length;
  const lines=ranked.slice(0,8).map((r,i)=>`${i+1}. ${r.name} (${r.code})${ids.length>1?' — '+(staff.find(p=>p.staff_id===r.id)?.full_name||r.id):''}: ${money(r.amount)}; ${bn?'বিক্রি হওয়া SKU':'sold SKUs'} ${r.skus.size}${r.total?' / '+r.total:''}; ${bn?'pending order':'pending order'} ${money(r.pending)}${r.last?'; '+(bn?'শেষ delivery':'last delivery')+' '+r.last:''}`);
  return (noData?(bn?'এই সময়সীমায় নির্বাচিত scope-এ cloud sales input নেই; বিক্রির তুলনা করে অগ্রাধিকার নির্ধারণ করা যাচ্ছে না। নিচের assigned outlet-গুলোতে delivery রেকর্ড পাওয়া যায়নি। Sales input/sync করার পরে তুলনামূলক তালিকা বদলাবে।\n':'No cloud sales inputs were found for this scope and period; a sales comparison cannot be established. The assigned outlets below have no recorded deliveries. The ranking will update after sales are entered/synced.\n'):'')+(bn?`লাইভ অ্যাপের তথ্য · ${month}-01 থেকে ${today} · নির্বাচিত SR/Zone\nমোট ${rows.size} active outlet; zero-sale ${zero}টি। আগে zero-sale, তারপর ${skuQuery?'কম SKU বিক্রি':'কম delivered sales'} অনুযায়ী ফোকাস করুন:\n`:`Live app data · ${month}-01 to ${today} · selected SR/zone\n${rows.size} active outlets; ${zero} zero-sales. Focus on zero-sales first, then ${skuQuery?'fewer sold SKUs':'lower delivered sales'}:\n`)+lines.join('\n')+(bn?'\nPending order achievement-এ ধরা হয়নি। SKU সংখ্যা হলো এই সময়ে delivery হওয়া আলাদা SKU; এটি shelf stock নয়। প্রথম আউটলেটগুলোতে stock, missing SKU ও buyer-এর order follow-up যাচাই করুন।':'\nPending orders are separate from achievement. Sold SKUs count distinct delivered SKUs in this period, not shelf stock. Check stock, missing SKUs and buyer order follow-up at these outlets first.');
 }
 root.FFH_SALES_INSIGHT={wants,answer};
})(typeof window==='undefined'?globalThis:window);
