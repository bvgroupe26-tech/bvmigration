import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  send: (channel: string, data: unknown) => ipcRenderer.send(channel, data),
  receive: (channel: string, callback: (...args: unknown[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
      callback(...args);
    };

    ipcRenderer.on(channel, listener);

    return () => ipcRenderer.removeListener(channel, listener);
  },
  invoke: (channel: string, data: unknown) => ipcRenderer.invoke(channel, data),
  minimize: () => ipcRenderer.send("win-minimize"),
  maximize: () => ipcRenderer.send("win-maximize"),
  close: () => ipcRenderer.send("win-close"),
});
