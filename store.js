'use strict';
window.FFHStore=(()=>{
 const KEY='ffh-v2-store-step2';
 const base={orders:[],targets:{},incomeSetup:{},productIncentives:[],cpo:[],dpo:[],routes:[],zeroSales:[],month:new Date().toISOString().slice(0,7)};
 let d; try{d={...base,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){d={...base}}
 const save=()=>localStorage.setItem(KEY,JSON.stringify(d));
 const id=p=>p+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
 return{
  data:()=>d,
  set:(k,v)=>(d[k]=v,save(),v),
  addOrder:o=>{const x={id:id('ORD'),createdAt:new Date().toISOString(),status:'Pending Delivery',deliveredAmount:0,...o};d.orders.push(x);save();return x},
  deliver:(orderId,amount)=>{const o=d.orders.find(x=>x.id===orderId);if(!o)return null;o.deliveredAmount=Number(amount)||0;o.status='Delivered';o.deliveredAt=new Date().toISOString();save();return o},
  deliveredTotal:(month,sr)=>d.orders.filter(o=>o.status==='Delivered'&&(!month||String(o.date||'').startsWith(month))&&(!sr||o.sr===sr)).reduce((a,o)=>a+Number(o.deliveredAmount||0),0),
  setTarget:(month,sr,value)=>{d.targets[month]??={};d.targets[month][sr]=Number(value)||0;save()},
  getTarget:(month,sr)=>Number(d.targets?.[month]?.[sr]||0),
  reset:()=>{d={...base};save()}
 };
})();