const fs = require('fs');
const path = require('path');

const genTypesPath = path.join(__dirname, '../src/core/types/gen-types.ts');

// Read the file content
const content = fs.readFileSync(genTypesPath, 'utf-8');

// Find the prettyTypeName function and insert the null check at the beginning
const fixedContent = content.replace(
    /(function prettyTypeName\(typ: any\): string \{\n\s+)(if \(Array\.isArray\(typ\)\))/,
    '$1if (typ === null) {\n        return "null";\n    }\n    $2'
);

// Write the fixed content back to the file
fs.writeFileSync(genTypesPath, fixedContent);

console.log('Successfully fixed gen-types.ts file'); 