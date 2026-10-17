import fs from 'node:fs/promises';

const file='public/stamp-style-v2.js';
let src=await fs.readFile(file,'utf8');

const countryTarget="    let country=normalCountry(loc?.country||'');\n    if(!country&&destinationIcao&&typeof countryFromIcao==='function')country=normalCountry(countryFromIcao(destinationIcao));";
const countryReplacement="    let country=normalCountry(loc?.country||'');\n    if(destinationIcao&&/^C[A-Z0-9]{3}$/i.test(destinationIcao))country='Canada';\n    else if(!country&&destinationIcao&&typeof countryFromIcao==='function')country=normalCountry(countryFromIcao(destinationIcao));";

if(src.includes(countryTarget)){
  src=src.replace(countryTarget,countryReplacement);
}else if(!src.includes("/^C[A-Z0-9]{3}$/i.test(destinationIcao)")){
  throw new Error('Could not find stamp country resolution target');
}

const cityTarget="    let city=family.family==='spontaneous'&&destinationIcao?spontaneousCityByIcao[destinationIcao]||'':'';";
const cityReplacement="    let city=family.family==='spontaneous'&&destinationIcao?spontaneousCityByIcao[destinationIcao]||'':'';\n    if(destinationIcao==='CYQY')city='Sydney';";
if(src.includes(cityTarget)){
  src=src.replace(cityTarget,cityReplacement);
}else if(!src.includes("if(destinationIcao==='CYQY')city='Sydney';")){
  throw new Error('Could not find stamp city resolution target');
}

await fs.writeFile(file,src,'utf8');
console.log('Canadian ICAO destinations render Canada; CYQY renders Sydney, Canada');
