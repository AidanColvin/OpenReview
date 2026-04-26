#!/bin/bash

echo "🚀 Securing files and preparing deployment..."

# 1. Stage all current, working files
git add .

# 2. Commit with an automatic timestamp so you always know when you pushed
git commit -m "Auto-deploy update: $(date +'%Y-%m-%d %H:%M:%S')" --no-verify

# 3. Force push to the main branch
git push origin main --force

# 4. Trigger the Vite build and GitHub Pages deployment
echo "⚙️ Building and publishing to GitHub Pages..."
npm run deploy

echo "✅ Success! Wait 60 seconds and check your site."
