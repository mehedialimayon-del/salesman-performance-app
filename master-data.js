/* FIELD FORCE HUB — MASTER DATA
   Replace/extend these arrays with the existing outlet/SKU data from the old app.
   Kept separate so UI modules never need to be rewritten when master data changes.
*/
window.FFH_MASTER = {
  outlets: [
    {code:"NSK-SETAPAK", name:"NSK Setapak", chain:"NSK", sr:""},
    {code:"GIANT-HYPER", name:"Giant Hypermarket", chain:"Giant", sr:""},
    {code:"MYDIN-DS", name:"Mydin Danau Saujana", chain:"Mydin", sr:""},
    {code:"KK-001", name:"KK Supermart", chain:"KK Supermart", sr:""}
  ],
  skus: [
    {code:"SKU-BASIL", name:"Basil Seed", category:"Beverage", active:true},
    {code:"SKU-PC", name:"Potato Crackers", category:"Snacks", active:true},
    {code:"SKU-MANGO", name:"Mango Juice", category:"Beverage", active:true}
  ],
  srs: [
    "Badruddoza Emon",
    "Limon Majumder",
    "Munnaf Hossain",
    "Rubayat Sams Adib"
  ]
};