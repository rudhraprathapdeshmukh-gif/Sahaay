const fs = require('fs');
let code = fs.readFileSync('src/pages/customer/FindProviders.tsx', 'utf8');

// Add console.log before filtering
code = code.replace(
  /        const { latitude: custLat, longitude: custLng } = customerLocation\n\n        for \(const prov of allProviders \?\? \[\]\) \{/,
  `        const { latitude: custLat, longitude: custLng } = customerLocation
        console.log('DEBUG: All providers fetched:', allProviders);

        for (const prov of allProviders ?? []) {`
);

// Add console.log inside the loop to see why it might be filtered out
code = code.replace(
  /          // Strictly exclude providers missing location data\n\s*if \(provLat === null \|\| provLat === undefined \|\| provLng === null \|\| provLng === undefined\) \{\n\s*continue\n\s*\}/,
  `          // Strictly exclude providers missing location data
          if (provLat === null || provLat === undefined || provLng === null || provLng === undefined) {
            console.log('DEBUG: Provider excluded (missing location):', prov.id);
            continue;
          }`
);

fs.writeFileSync('src/pages/customer/FindProviders.tsx', code, 'utf8');
console.log("Patched FindProviders.tsx with debug logs");
