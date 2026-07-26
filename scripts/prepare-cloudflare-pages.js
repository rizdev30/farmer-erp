const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

const workerSrc = path.join('.open-next', 'worker.js');
const workerDest = path.join('.open-next', 'assets', '_worker.js');

if (fs.existsSync(workerSrc)) {
  copyRecursive(workerSrc, workerDest);
  console.log(`Copied ${workerSrc} -> ${workerDest}`);
}

['server-functions', 'cloudflare', 'middleware', '.build'].forEach((dir) => {
  const src = path.join('.open-next', dir);
  const dest = path.join('.open-next', 'assets', dir);
  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
    console.log(`Copied ${src} -> ${dest}`);
  }
});

console.log('Successfully prepared Cloudflare Pages output in .open-next/assets');
