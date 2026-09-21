// Audit-only regression evidence. Uses synthetic data and in-memory browser/IPC stubs.
// Run from repository root: node audit/2026-09-20/reproduce.cjs
// A PASS means the named observation was reproduced, NOT that the app is secure.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const results = [];
function source(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function compile(code) { return ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; }
function findNode(file, predicate) {
  const sf = ts.createSourceFile(file, source(file), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JS);
  let found;
  function walk(n) { if (!found && predicate(n, sf)) found = n; if (!found) ts.forEachChild(n, walk); }
  walk(sf); assert.ok(found, `Source node missing in ${file}`); return found.getText(sf);
}
function closure(file, name, context) {
  const node = findNode(file, n => ts.isVariableDeclaration(n) && n.name.getText() === name);
  const out = compile(`const ${node}; globalThis.auditFn = ${name};`);
  vm.runInNewContext(out, context); return context.auditFn;
}
const storage = new Map();
const localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,String(v)), removeItem: k => storage.delete(k) };
const quiet = { log(){}, warn(){}, error(){} };
const serviceContext = { exports: {}, window: { crypto: crypto.webcrypto }, localStorage, TextEncoder, TextDecoder, Blob, Uint8Array, DataView, console: quiet };
vm.runInNewContext(compile(source('src/services/cryptoService.ts')), serviceContext);
const svc = serviceContext.exports;
async function check(name, fn) {
  try { const details = await fn(); results.push({ name, observationReproduced: true, details }); }
  catch (e) { results.push({ name, observationReproduced: false, error: e.stack }); process.exitCode = 1; }
}
const items = [{ id:'audit-only-1', title:'SYNTHETIC AUDIT ITEM', category:'login', password:'NOT-A-REAL-SECRET' }];
const plan = { expiryTimestamp: Math.floor(Date.now()/1000)+86400, userPublicHex:'11'.repeat(32), heirPublicHex:'22'.repeat(32) };
(async () => {
  await check('A01 exported package decrypts without password, secret key, or USB', async () => {
    const sk = svc.generateSecretKey();
    const file = await svc.exportEncryptedVaultPackage(items, 'Synthetic-export-password!', plan, sk);
    assert.equal(JSON.parse(file).requiresSecretKey, true);
    const out = await svc.importEncryptedVaultPackage(file, undefined, undefined, { isDualUsbReadOnly:true });
    assert.equal(out.items[0].password, items[0].password);
    return 'Real export/import service; no USB API or credential supplied to import.';
  });
  await check('A02 local data decrypts from stored metadata without user input', async () => {
    const pass = await svc.hashPassword('Synthetic-master-password!');
    localStorage.setItem('legacylock_plan', JSON.stringify({...plan, usbPasswordConfig:{masterPasswordHash:pass.hashHex, secretKeyHash:'33'.repeat(32)}}));
    await svc.saveSecureLocalItems(items);
    const out = await svc.loadSecureLocalItems();
    assert.equal(out[0].password, items[0].password);
    return 'Fresh service invocation needs only the saved plan and ciphertext, no password input.';
  });
  await check('A03 encryption failure writes plaintext fallback', async () => {
    serviceContext.window.crypto = { getRandomValues(){throw new Error('audit injected crypto failure');} };
    try { await svc.saveSecureLocalItems(items); } finally { serviceContext.window.crypto = crypto.webcrypto; }
    assert.equal(JSON.parse(localStorage.getItem('legacylock_items'))[0].password, items[0].password);
    return 'Injected CSPRNG failure; plaintext persisted in legacylock_items.';
  });
  await check('A04 absent takeover factors accepted', async () => {
    assert.equal((await svc.verifyTakeoverCredentials('anything', '', {hasMasterPassword:false, hasSecretKey:false})).success,true);
    return 'Both factors disabled: any nonempty UI password can pass service verification.';
  });
  await check('A05 fabricated container passes all six health checks', async () => {
    const out = await svc.performVaultHealthCheck({ciphertext_hex:'not-valid-ciphertext',user_public_hex:'x',heir_public_hex:'y',lvcf_header:{magic:'LEGACYLOCK',container:'LVCF',owner_signature_hex:'z'.repeat(64),sequence:1}},items);
    assert.equal(out.score,100); assert.equal(out.status,'Healthy');
    return 'Invalid signature, ciphertext, and key data reported Healthy / 100; rescue assumed present.';
  });
  await check('A06 browser dual USB fallback reports success without decryption', async () => {
    const out = await svc.decryptWithDualUsb({masterDrive:{mountPath:'audit',hasUserKey:true},heirDrive:{mountPath:'audit',hasHeirKey:true},currentItems:items});
    assert.equal(out.success,true); assert.equal(out.items,items);
    return 'Same path used for both drives; no key bytes read.';
  });
  await check('A07 lock-screen USB action calls unlock without cryptographic verification', async () => {
    const expr = findNode('src/components/LockScreen.tsx', n => ts.isJsxAttribute(n) && n.name.getText()==='onClick' && n.getText().includes('onHeirReadOnlyUnlock?.()'));
    // Extract the actual JSX expression, not a reimplementation of the handler.
    const sf = ts.createSourceFile('tmp.tsx',`<button ${expr}/>`,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    let body; function walk(n){ if(ts.isJsxAttribute(n)&&n.name.getText()==='onClick') body=n.initializer.expression.getText(sf); ts.forEachChild(n,walk); } walk(sf);
    let called=false;
    const ctx={setErrorMsg(){},heirUsbDrive:{mountPath:'audit'},verifyDriveHardwareBinding:async()=>({matched:true}),onHeirReadOnlyUnlock(){called=true;},t:x=>x};
    vm.runInNewContext(compile(`globalThis.auditFn = ${body};`),ctx); await ctx.auditFn(); assert.equal(called,true);
    return 'Actual click handler has no master key read, CLI unlock, password, or ciphertext verification.';
  });
  await check('A08 read-only import persists data but restart defaults to owner', async () => {
    let mode='OWNER',canModify=true,arr=[];
    const ctx={setOperatingMode:v=>mode=v,setHeirCanModify:v=>canModify=v,setItems:v=>arr=typeof v==='function'?v(arr):v,Set};
    closure('src/App.tsx','handleImportSuccess',ctx)(items,true,true);
    assert.equal(mode,'HEIR_RECOVERY');assert.equal(canModify,false);
    storage.clear(); await svc.saveSecureLocalItems(arr);
    assert.equal((await svc.loadSecureLocalItems())[0].id,items[0].id);
    const appSource=source('src/App.tsx');
    assert.match(appSource,/useState<OperatingMode>\('OWNER'\)/);assert.match(appSource,/\[heirCanModify, setHeirCanModify\] = useState<boolean>\(true\)/);
    return 'Actual import handler + real storage, with source-verified nonpersistent role initializers; not a desktop restart test.';
  });
  await check('A09 failed native backup response still reports success', async () => {
    let message='';
    const ctx={isElectronApp:()=>true,window:{legacyLockAPI:{saveVaultContainer:async()=>({success:false,error:'audit disk full'})}},container:{},alert:v=>message=v,t:x=>x};
    await closure('src/App.tsx','handleSaveToDrive',ctx)(); assert.equal(message,'app.vaultSavedSuccessAlert');
    return 'Actual UI handler consumes resolved success:false as success.';
  });
  await check('A10 migration reports success with only timers and no file operations', async () => {
    let completed='';
    const ctx={targetDrive:'audit-target',alert(){},t:x=>x,setIsMigrating(){},setStatusText(){},setTimeout:fn=>fn(),onMigrateSuccess:p=>completed=p};
    closure('src/components/MediaMigrationModal.tsx','handleStartMigration',ctx)();assert.equal(completed,'audit-target');
    return 'Actual handler runs in a context with no filesystem or IPC APIs.';
  });
  await check('A11 normal import discards original plan and read-only result', async () => {
    let args;
    const ctx={setImportErrorMsg(){},setImportSuccessMsg(){},importFile:{content:'audit'},setIsImporting(){},importPassword:'audit',importSecretKey:'',importEncryptedVaultPackage:async()=>({items,plan:{originalOwner:true},itemCount:1,isReadOnly:true}),onImportSuccess:(...v)=>args=v,mergeStrategy:'overwrite',setImportFile(){},setImportPassword(){},setImportSecretKey(){},fileInputRef:{current:null}};
    await closure('src/components/ImportExportView.tsx','handleExecuteImport',ctx)();assert.equal(args.length,2);assert.equal(args[2],undefined);
    return 'Actual handler forwards items and overwrite only; original authentication configuration is dropped.';
  });
  const handlers=new Map(), writes=[];
  const ipcSource=findNode('electron/main.cjs',n=>ts.isFunctionDeclaration(n)&&n.name?.text==='registerIpcHandlers');
  const ipcContext={ipcMain:{handle:(name,fn)=>handlers.set(name,fn)},fs:{existsSync:()=>false,mkdirSync(){},writeFileSync:(...args)=>writes.push(args)},path,app:{getPath:()=>path.join(__dirname,'virtual-userdata')},__dirname:path.join(root,'electron'),Date};
  vm.runInNewContext(ipcSource+'; registerIpcHandlers();',ipcContext);
  await check('A12 deleting binding file bypasses anti-clone check', async()=>{
    const out=await handlers.get('vault:verify-drive-binding')({}, {drivePath:'virtual-copy',currentFingerprint:'different-device'});
    assert.equal(out.matched,true);assert.equal(out.isBound,false);return 'Real IPC handler, in-memory filesystem reports binding file absent.';
  });
  await check('A13 privileged IPC accepts untrusted sender and caller-selected path',async()=>{
    const out=await handlers.get('vault:save-container')({senderFrame:{url:'https://untrusted.invalid'}},{encryptedPackage:'SYNTHETIC',targetPath:'virtual-arbitrary-target'});
    assert.equal(out.success,true);assert.ok(writes.some(([p])=>p.startsWith('virtual-arbitrary-target')));
    return 'Direct IPC unit invocation, stubbed filesystem; demonstrates absent guards, not a demonstrated remote exploit.';
  });
  await check('A14 plaintext import needs no authentication and returns writable',async()=>{
    const out=await svc.importEncryptedVaultPackage(JSON.stringify({items}));assert.equal(out.isReadOnly,false);assert.equal(out.itemCount,1);
    return 'JSON compatibility channel is accepted without password/secret; UI labels it double verification.';
  });
  fs.writeFileSync(path.join(__dirname,'reproduction-results.json'),JSON.stringify({generatedAt:new Date().toISOString(),sourceCommit:'6da8a19b07efa5a3f66eed5fa988ec7dee5c8900',note:'PASS means insecure observation reproduced. No user vault, real USB, or OS settings accessed.',results},null,2));
  for(const r of results) console.log(`${r.observationReproduced?'PASS':'FAIL'} ${r.name}${r.error?'\n'+r.error:''}`);
})();
