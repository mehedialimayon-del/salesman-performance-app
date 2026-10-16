/* Bilingual retrieval: compare concepts, keep unrelated policies separate. */
(() => {
  const aliases = [
    [/purchase\s*orders?|\bp\.?o\.?\b|পি\s*ও|পিও|অর্ডার|orders?/giu,'order'],
    [/customers?|buyers?|বায়ার|বায়ার|কাস্টমার|ক্রেতা/giu,'buyer'],
    [/সেলস|সেল|sales?/giu,'sales'],[/টার্গেট|targets?|লক্ষ্য/giu,'target'],
    [/আউটলেট|দোকান|outlets?|shops?|stores?/giu,'outlet'],
    [/ইনকাম|বেতন|salary|income/giu,'income'],[/রুট|routes?/giu,'route'],
    [/ডেলিভারি|delivery|delivered/giu,'delivery'],[/স্টক|stock|inventory/giu,'stock'],
    [/ডিসপ্লে|displays?|shelf/giu,'display'],[/প্রাইস|দাম|মূল্য|prices?/giu,'price'],
    [/ডিসকাউন্ট|discounts?/giu,'discount'],[/বকেয়া|বকেয়া|বাকি টাকা|outstanding|collections?|payment/giu,'payment'],
    [/ওসিআর|ও সি আর|\bocr\b|ছবি থেকে লেখা/giu,'ocr'],
    [/এক্সপায়ারি|এক্সপায়ারি|মেয়াদ|মেয়াদ|expiry|expired|expiration/giu,'expiry'],
    [/রিটার্ন|returns?/giu,'return'],[/রিপোর্ট|reports?/giu,'report'],
    [/হচ্ছে\s*না|হচ্ছেনা|দিচ্ছে\s*না|দিচ্ছেনা|পাচ্ছি\s*না|পারছি\s*না|refus\w*|not\s+(giving|getting)|no\s+orders?/giu,'negative']
  ];
  const stop=new Set('আমি আমার আমাকে আমরা আমাদের ভাই স্যার একটা এই ওই হচ্ছে হবে করে করব করুন কিভাবে কীভাবে কেন কি কী তো যে কত the a an is are was were my me we our you your do does did how what why can i to of for and please about'.split(' '));
  const normalize = value => {let text=String(value||'').normalize('NFKC').toLowerCase();for(const [re,to] of aliases)text=text.replace(re,' '+to+' ');return text.replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');};
  const tokens = value => [...new Set(normalize(value).split(' ').filter(x=>x.length>1&&!stop.has(x)))];
  const domains='order sales buyer target outlet income route delivery stock display price discount payment ocr expiry return report'.split(' ');
  const score = (a,b) => {
    const na=normalize(a),nb=normalize(b);if(!na||!nb)return 0;if(na===nb)return 1;
    const A=tokens(a),B=tokens(b),shared=A.filter(x=>B.includes(x));
    const da=domains.filter(x=>A.includes(x)),db=domains.filter(x=>B.includes(x));
    if(da.length&&db.length&&!da.some(x=>db.includes(x)))return 0;
    if(A.includes('negative')!==B.includes('negative')&&(A.includes('negative')||B.includes('negative')))return 0;
    if(shared.length<2)return 0;
    return .65*shared.length/Math.min(A.length,B.length)+.35*shared.length/Math.max(A.length,B.length);
  };
  const answer=(text,pairs)=>{
    const exact=pairs.find(p=>p.active!==false&&p.answer&&String(p.question||'').split(/[|;\n]+/).some(q=>normalize(q)===normalize(text)));
    if(exact)return exact.answer;
    const ranked=pairs.filter(p=>p.active!==false&&p.question&&p.answer).map(p=>({p,score:Math.max(...String(p.question).split(/[|;\n]+/).map(q=>score(text,q)))})).sort((a,b)=>b.score-a.score);
    const best=ranked[0],other=ranked.find(x=>x.p.answer!==best?.p.answer);
    return best?.score>=.62&&(!other||best.score-other.score>=.08)?best.p.answer:'';
  };
  window.FFH_AI_MATCH={normalize,tokens,score,answer};
})();
