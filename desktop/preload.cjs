const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  call: (action, ...args) => ipcRenderer.invoke("desktop:call", action, ...args),
  onEvent: (handler) => {
    const listener = (_event, kind, payload) => handler(kind, payload);
    ipcRenderer.on("desktop:event", listener);
    return () => ipcRenderer.removeListener("desktop:event", listener);
  },
});
