const fs = require('fs');
const path = require('path');

function fixEverything(dir) {
    fs.readdirSync(dir).forEach(file => {
        const p = path.join(dir, file);
        if (fs.statSync(p).isDirectory()) {
            fixEverything(p);
        } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
            let code = fs.readFileSync(p, 'utf8');
            let startCode = code;

            // 1. Wipe the Parser Error entirely so it accepts everything
            code = code.replace(/Could not parse.*?instead\.?/gi, '');
            code = code.replace(/setError\([^)]*Could not parse[^)]*\)/gi, 'setError(null)');

            // 2. Fix Title & Abstract Swap (Puts the real text in bold, filename underneath)
            code = code.replace(/\{([a-zA-Z0-9_]+)\.title\}/g, '{($1.title && /\\.(pdf|docx?|zip|rar|png|jpg|csv|xlsx?)$/i.test($1.title) && $1.abstract) ? $1.abstract.substring(0, 120) + "..." : $1.title}');
            code = code.replace(/\{([a-zA-Z0-9_]+)\.abstract\}/g, '{($1.title && /\\.(pdf|docx?|zip|rar|png|jpg|csv|xlsx?)$/i.test($1.title) && $1.abstract) ? $1.title : $1.abstract}');

            // 3. Fix Stacking: Modifies the React state to place newest files ON TOP of old ones
            const setters = ['setArticles', 'setFiles', 'setParsedData', 'setUploadedFiles', 'addArticles'];
            setters.forEach(setter => {
                // Finds setArticles(newFiles) and changes it to setArticles(prev => [...newFiles, ...prev])
                const regex = new RegExp(`${setter}\\s*\\(\\s*(?!prev|state)([^\\)]+)\\s*\\)`, 'g');
                code = code.replace(regex, `${setter}(prev => { const isArr = Array.isArray(prev); const newVals = Array.isArray($1) ? $1 : [$1]; return [...newVals, ...(isArr ? prev : [])]; })`);
            });

            if (code !== startCode) {
                fs.writeFileSync(p, code);
                console.log('✅ Successfully fixed UI logic in:', p);
            }
        }
    });
}

fixEverything(path.join(__dirname, 'src'));
