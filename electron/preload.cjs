"use strict";
const { contextBridge, ipcRenderer } = require("electron");
const methods = [
  "status",
  "newSecret",
  "initialize",
  "unlock",
  "lock",
  "saveItem",
  "deleteItem",
  "settings",
  "scan",
  "provision",
  "sync",
  "recover",
  "importOwner",
  "export",
  "credentials",
  "health",
  "migrate",
  "preferences",
  "setPreferences",
  "windowControl",
  "copy",
];
const api = {};
for (const method of methods)
  api[method] = (...args) => ipcRenderer.invoke("secure:" + method, ...args);
api.onLocked = (callback) => {
  const listener = () => callback();
  ipcRenderer.on("secure:locked", listener);
  return () => ipcRenderer.removeListener("secure:locked", listener);
};
api.activity = () => ipcRenderer.send("secure:activity");
contextBridge.exposeInMainWorld("vaultAPI", Object.freeze(api));
