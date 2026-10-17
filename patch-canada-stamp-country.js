import fs from 'node:fs/promises';

const file='public/stamp-style-v2.js';
let src=await fs.readFile(file,'utf8');

const target="    let country=normalCountry(loc?.country||'');\n    if(!country&&destinationIcao&&typeof countryFromIcao==='function')country=normalCountry(countryFromIcao(destinationIcao));";
const replacement="    let country=normalCountry(loc?.country||'');\n    if(destinationIcao&&/^C[A-Z0-9]{3}$/i.test(destinationIcao))country='Canada';\n    else if(!country&&destinationIcao&&typeof countryFromIcao==='function')country=normalCountry(countryFromIcao(destinationIcao));";

if(src.includes(target)){
  src=src.replace(target,replacement);
}else if(!src.includes("/^C[A-Z0-9]{3}$/i.test(destinationIcao)")){
  throw new Error('Could not find stamp country resolution target');
}

await fs.writeFile(file,src,'utf8');
console.log('Canadian ICAO destinations now render Canada on Passport stamps');
