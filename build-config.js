const fs = require('fs');
const path = require('path');

// Ambil nama dari environment variable atau default
const productName = process.env.PRODUCT_NAME || 'Stena';

// Sanitasi nama untuk filename
const safeName = productName
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

const packagePath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Update productName
packageJson.build.productName = productName;

// Update artifact names
packageJson.build.mac.artifactName = `${safeName}-Mac-\${arch}-\${version}.\${ext}`;
packageJson.build.win.artifactName = `${safeName}-Windows-\${version}.\${ext}`;

// Simpan package.json
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`✅ Build configured with product name: "${productName}"`);
console.log(`   Safe name: "${safeName}"`);