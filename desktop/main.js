const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let backendProcess;

function startBackend() {
  // Path to the backend index.js
  const backendPath = path.join(__dirname, '..', 'backend', 'index.js');
  
  // Start the backend as a separate process
  backendProcess = fork(backendPath, [], {
    cwd: path.join(__dirname, '..', 'backend'),
    env: { ...process.env, PORT: 5000 }
  });

  backendProcess.on('message', (msg) => {
    console.log('Backend message:', msg);
  });

  backendProcess.on('error', (err) => {
    console.error('Backend error:', err);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    title: "HIVE.AI - THE 3D ENGINE",
    backgroundColor: '#050506',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true
  });

  // Load the standalone frontend file
  win.loadFile(path.join(__dirname, '..', 'frontend', 'index.html'));

  // Open DevTools during development if needed
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (backendProcess) backendProcess.kill();
});
