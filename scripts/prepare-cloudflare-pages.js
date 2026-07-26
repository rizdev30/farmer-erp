const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function shouldSkipFile(filename) {
  if (filename.endsWith('.so.node')) return true;
  if (filename.startsWith('query-engine-')) return true;
  if (filename.includes('query_engine_bg.sqlite')) return true;
  if (filename.includes('query_engine_bg.mysql')) return true;
  if (filename === 'capsize-font-metrics.json') return true;
  if (filename === 'google-font-metrics.json') return true;
  return false;
}

function copyRecursive(src, dest) {
  const filename = path.basename(src);
  if (shouldSkipFile(filename)) {
    return;
  }

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
}

['server-functions', 'cloudflare', 'middleware', '.build'].forEach((dir) => {
  const src = path.join('.open-next', dir);
  const dest = path.join('.open-next', 'assets', dir);
  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
  }
});

// Minify handler.mjs to keep worker size as small as possible
const handlerPath = path.join('.open-next', 'assets', 'server-functions', 'default', 'handler.mjs');
if (fs.existsSync(handlerPath)) {
  try {
    execSync(`npx esbuild "${handlerPath}" --minify --allow-overwrite --outfile="${handlerPath}"`, { stdio: 'ignore' });
    console.log('Minified server handler.mjs');
  } catch (e) {
    console.log('Minification skipped or completed with warnings');
  }
}

console.log('Successfully prepared optimized Cloudflare Pages output in .open-next/assets');
