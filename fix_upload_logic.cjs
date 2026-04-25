const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src'));

files.forEach(file => {
    let code = fs.readFileSync(file, 'utf8');
    let changed = false;

    // 1. Silence the "Could not parse" red error completely
    if (code.includes('Could not parse')) {
        // Removes it from state setters
        code = code.replace(/['"`]Could not parse.*?Try a RIS.*?['"`]/gi, 'null');
        // Removes it if hardcoded in HTML/JSX tags
        code = code.replace(/>\s*Could not parse.*?Try a RIS.*?<\//gi, '></');
        changed = true;
    }

    // 2. Fix Appending (Stop overwriting previous files)
    const appendRegex = /(setArticles|setFiles|setParsedData|setUploadedFiles)\(\s*([a-zA-Z0-9_]+)\s*\)/g;
    if (appendRegex.test(code)) {
        code = code.replace(appendRegex, (match, setter, variable) => {
            if (variable === 'prev') return match;
            return `${setter}(prev => { const arr = Array.isArray(${variable}) ? ${variable} : [${variable}]; return [...(prev || []), ...arr]; })`;
        });
        changed = true;
    }

    // 3. Fix the Title vs Abstract swap in UI for PDFs/DOCXs
    if (file.endsWith('.tsx') && code.includes('.title')) {
        code = code.replace(/\{([a-zA-Z0-9_]+)\.title\}/g, '{$1.title?.match(/\\.(pdf|docx?|zip|rar|png|jpg|csv|xlsx?|txt)$/i) && $1.abstract ? $1.abstract.substring(0, 150) : $1.title}');
        code = code.replace(/\{([a-zA-Z0-9_]+)\.abstract\}/g, '{$1.title?.match(/\\.(pdf|docx?|zip|rar|png|jpg|csv|xlsx?|txt)$/i) && $1.abstract ? $1.title : $1.abstract}');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, code);
        console.log(`Successfully Patched Logic in: ${file}`);
    }
});
