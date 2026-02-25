
const fs = require('fs');
const os = require('os');
const path = require('path');

const registryHost = 'astro-registry.ngrok.app';
const npmrc = fs.readFileSync(path.join(os.homedir(), '.npmrc'), 'utf8');

const match = npmrc.match(new RegExp(`//${registryHost}/:_authToken=(.+)`));
if (!match) {
  process.stderr.write(`No npm token found for ${registryHost}. Run: npm login --registry https://${registryHost}\n`);
  process.exit(1);
}

console.log(`Bearer ${match[1].trim()}`);