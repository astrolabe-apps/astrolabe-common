
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

// Expected .npmrc format in ~/.npmrc:

// @astroapps:registry=https://astro-registry.ngrok.app
// @react-typed-forms:registry=https://astro-registry.ngrok.app
// //astro-registry.ngrok.app/:_authToken=REA11y-5ECUR3-T0K3N-i5-5up3R-s3cr3t-4nd-sup3r-l0ng-t0k3n-1n-4-b34r3r-f0rm4t