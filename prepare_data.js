const fs = require('fs');
const zlib = require('zlib');
const { execSync } = require('child_process');

console.log('Processing HYG star database...');

const inputFile = '/home/mike/codeberg/wrightmikea/hyg/data/hyg/CURRENT/hyg_v42.csv.gz';
const outputFile = 'stars.json';

console.log('Reading compressed CSV file...');
const compressedData = fs.readFileSync(inputFile);

console.log('Decompressing...');
const csvData = zlib.gunzipSync(compressedData).toString();

console.log('Parsing CSV...');
const lines = csvData.split('\n');
const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

console.log(`Found ${lines.length - 1} stars`);

const namedStars = [];
const MAX_MAGNITUDE = 8;

for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',');
    const star = {};
    
    const magIndex = headers.indexOf('mag');
    const properIndex = headers.indexOf('proper');
    
    const mag = magIndex >= 0 ? parseFloat(values[magIndex].replace(/"/g, '')) || 0 : 0;
    const proper = properIndex >= 0 ? values[properIndex].replace(/"/g, '').trim() : '';
    
    if (mag > MAX_MAGNITUDE) continue;
    if (!proper || proper === '' || proper === 'Sol') continue;
    
    ['id', 'proper', 'ra', 'dec', 'dist', 'mag', 'x', 'y', 'z'].forEach(field => {
        const index = headers.indexOf(field);
        if (index >= 0) {
            let value = values[index] ? values[index].trim() : '';
            value = value.replace(/"/g, '');
            
            if (['ra', 'dec', 'dist', 'mag', 'x', 'y', 'z'].includes(field)) {
                star[field] = parseFloat(value) || 0;
            } else {
                star[field] = value;
            }
        }
    });
    
    namedStars.push(star);
}

console.log(`Processed ${namedStars.length} named stars (mag <= ${MAX_MAGNITUDE})`);

const data = {
    stars: namedStars,
    namedStars: namedStars
};

console.log('Writing JSON file...');
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));

const stats = fs.statSync(outputFile);
console.log(`Created ${outputFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

console.log('Done!');
