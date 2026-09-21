// Uses freshly built CLI and synthetic fixtures only. No removable media access.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),ts=require('typescript');
const root=path.resolve(__dirname,'../..');
const base=path.join(__dirname,'runtime');fs.mkdirSync(base,{recursive:true});
const dir=fs.mkdtempSync(path.join(base,'synthetic-'));
const cli=path.join(root,'crypt/target/debug',process.platform==='win32'?'vault-cli.exe':'vault-cli');
const paths={u:path.join(dir,'user-key.bin'),h:path.join(dir,'heir-key.bin'),c:path.join(dir,'config.bin'),v:path.join(dir,'vault.json'),p:path.join(dir,'input.json')};
function run(args){return spawnSync(cli,args,{encoding:'utf8',timeout:10000});}
function good(args){const r=run(args);assert.equal(r.status,0,r.stderr);return r.stdout;}
const keys=JSON.parse(good(['generate-keys','--user-out',paths.u,'--heir-out',paths.h,'--config-out',paths.c,'--expiry-days=1']));
const plain=JSON.stringify({items:[{id:'rust-audit',password:'SYNTHETIC-NON-SECRET'}]});fs.writeFileSync(paths.p,plain);
good(['encrypt','--user-key',paths.u,'--heir-key',paths.h,'--config',paths.c,'--input',paths.p,'--output',paths.v]);
const unlock=['unlock','--user-key',paths.u,'--heir-key',paths.h,'--config',paths.c,'--vault',paths.v];assert.equal(good(unlock).trim(),plain);
const original=JSON.parse(fs.readFileSync(paths.v,'utf8'));const results=[];
async function check(name,fn){try{const details=await fn();results.push({name,observationReproduced:true,details});}catch(e){results.push({name,observationReproduced:false,error:e.stack});process.exitCode=1;}}
(async()=>{
 await check('R01 one heir private key plus public container decrypts Rust vault',()=>{
   // This operation receives no owner private material.
   const heirPrivate=fs.readFileSync(paths.h).subarray(0,32);
   const privateKey=crypto.createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b656e04220420','hex'),heirPrivate]),format:'der',type:'pkcs8'});
   const publicKey=crypto.createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b656e032100','hex'),Buffer.from(original.user_public_hex,'hex')]),format:'der',type:'spki'});
   const key=crypto.createHash('sha256').update(crypto.diffieHellman({privateKey,publicKey})).digest();
   const bytes=Buffer.from(original.ciphertext_hex,'hex'),dec=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(original.nonce_hex,'hex'));dec.setAuthTag(bytes.subarray(-16));
   assert.equal(Buffer.concat([dec.update(bytes.subarray(0,-16)),dec.final()]).toString(),plain);
   return 'Native Rust-generated vault decrypted using only heir-key.bin and public data in vault; CLI argument guards are bypassed by independent decryption.';
 });
 await check('R02 mutable config expiry controls decryption without authentication',()=>{
   const cfg=fs.readFileSync(paths.c);cfg.writeBigInt64LE(1n,0);fs.writeFileSync(paths.c,cfg);assert.notEqual(run(unlock).status,0);
   cfg.writeBigInt64LE(BigInt(Math.floor(Date.now()/1000)+86400),0);fs.writeFileSync(paths.c,cfg);assert.equal(good(unlock).trim(),plain);
   return 'Same ciphertext rejected/accepted solely by editing eight unauthenticated expiry bytes.';
 });
 await check('R03 malformed nonce panics instead of returning a validation error',()=>{
   fs.writeFileSync(paths.v,JSON.stringify({...original,nonce_hex:'00'}));const r=run(unlock);assert.notEqual(r.status,0);assert.match(r.stderr,/panicked|assertion/);
   fs.writeFileSync(paths.v,JSON.stringify(original));return 'Actual debug CLI panics on 1-byte nonce; release panic=abort makes this a process termination.';
 });
 await check('R04 Web writer output cannot be read by native Rust unlock',async()=>{
   const ctx={exports:{},window:{crypto:crypto.webcrypto},TextEncoder,TextDecoder,Uint8Array,Blob,console};
   vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'src/services/cryptoService.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);
   const p={userPublicHex:keys.user_public_hex,heirPublicHex:keys.heir_public_hex,serverHashHex:keys.server_hash_hex,expiryTimestamp:keys.expiry_timestamp};
   const c=await ctx.exports.encryptVaultWeb(JSON.parse(plain).items,p);fs.writeFileSync(paths.v,JSON.stringify(c));const r=run(unlock);assert.notEqual(r.status,0);assert.match(r.stderr,/解密失败/);
   return 'Current App.tsx writer encryptVaultWeb with genuine key metadata produces ciphertext native unlock cannot decrypt.';
 });
 fs.writeFileSync(path.join(__dirname,'rust-reproduction-results.json'),JSON.stringify({generatedAt:new Date().toISOString(),note:'PASS means insecure observation reproduced; fixtures are synthetic and kept in gitignored runtime/.',baseline:'Native generate/encrypt/unlock round trip passed.',results},null,2));
 for(const r of results)console.log(`${r.observationReproduced?'PASS':'FAIL'} ${r.name}${r.error?'\n'+r.error:''}`);
})();
