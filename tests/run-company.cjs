const {spawnSync}=require('node:child_process');
const tests=['earnings-core','company-incentives','accounts-dom','accounts-api','earnings-dom','income-regression','manager-login','notification-delivery-dom','briefings-dom','session-photo-ai','duty-core','duty-dom'];
for(const name of tests){const r=spawnSync(process.execPath,['tests/'+name+'.cjs'],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
console.log('PASS '+tests.length+' regression suites. Physical Android acceptance is separate.');
