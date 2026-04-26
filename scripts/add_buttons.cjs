const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

if (!html.includes('btn-batch-include')) {
    const replacement = `
      <div style="display:flex;gap:1.5rem;margin-top:2.5rem;width:100%;grid-column: 1 / -1;">
        <button id="btn-batch-include" style="flex:1;background:#22c55e;color:#fff;font-family:'DM Sans',sans-serif;font-weight:600;font-size:1.1rem;padding:1.25rem;border-radius:12px;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(34,197,94,0.2);">
          Include All Articles
        </button>
        <button id="btn-batch-exclude" style="flex:1;background:#f87171;color:#fff;font-family:'DM Sans',sans-serif;font-weight:600;font-size:1.1rem;padding:1.25rem;border-radius:12px;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(248,113,113,0.2);">
          Exclude All Articles
        </button>
      </div>
    </div>
  </div>
  `;
    
    // Inject at the bottom of the import screen grid
    html = html.replace('    </div>\n  </div>\n  ', replacement);
    html = html.replace('  </div>\n  ', replacement);
    
    // Cache bust to force browsers to show the new V7 version
    html = html.replace(/<title>OpenReview(?: V\d+)?<\/title>/g, '<title>OpenReview V7</title>');
    
    fs.writeFileSync('index.html', html);
    console.log('✅ Successfully added Include/Exclude boxes to HTML');
}
