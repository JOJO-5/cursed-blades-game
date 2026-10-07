import {readFile,writeFile} from 'node:fs/promises';
const version=process.argv[2];if(!/^0\.\d+\.0-preview\.\d+$/.test(version))throw Error('Expected preview version');
for(const file of ['package.json','package-lock.json']){const data=JSON.parse(await readFile(file,'utf8'));data.version=version;if(data.packages)data.packages[''].version=version;await writeFile(file,JSON.stringify(data,null,2)+'\n');}
const index=await readFile('index.html','utf8');await writeFile('index.html',index.replace(/\?v=[^"&]+/g,'?v='+version));
