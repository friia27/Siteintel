# SITE INTEL — AI Progress Logger

AI-powered construction site progress reporting. Upload a job site photo,
get a full trade-by-trade progress report in seconds.

Built for NYC construction foremen. Designed for Meta glasses integration.

---

## WHAT IT DOES

- Upload any job site photo (phone, tablet, Meta glasses)
- AI analyzes the photo and identifies trade progress
- Generates a structured report: framing, electrical, plumbing, drywall, etc.
- Export as text report or CSV for Procore / PlanGrid

---

## HOW TO DEPLOY (free, 10 minutes)

### STEP 1 — Get your Anthropic API key
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Click "API Keys" → "Create Key"
4. Copy the key (starts with sk-ant-...)

### STEP 2 — Put the code on GitHub
1. Go to https://github.com and create a free account if you don't have one
2. Click the "+" button → "New repository"
3. Name it: siteintel
4. Set to Private
5. Click "Create repository"
6. Upload all the files from this folder to that repo
   (drag and drop the whole folder into the GitHub page)

### STEP 3 — Deploy on Vercel (free)
1. Go to https://vercel.com and sign up with your GitHub account
2. Click "Add New Project"
3. Select your "siteintel" repository
4. Click "Deploy" — Vercel auto-detects Next.js

### STEP 4 — Add your API key to Vercel
1. In Vercel, go to your project → Settings → Environment Variables
2. Add:
   - Name:  ANTHROPIC_API_KEY
   - Value: (paste your key from Step 1)
3. Click Save
4. Go to Deployments → click the three dots → Redeploy

### STEP 5 — Open on your phone
1. Vercel gives you a URL like: siteintel-xyz.vercel.app
2. Open that on your phone
3. Take a job site photo, upload it, hit Analyze
4. Done — it works!

---

## USING WITH META RAY-BAN GLASSES

The glasses can take photos and send them to your phone.
Until the direct integration is built:
1. Take photo with glasses → it saves to your phone
2. Open Site Intel on phone
3. Upload the photo from your camera roll
4. Get your progress report

Direct glasses → app integration is on the roadmap.

---

## PROJECT STRUCTURE

```
siteintel/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.js      ← AI analysis API (server-side, key stays safe)
│   ├── globals.css
│   ├── layout.js
│   ├── page.js
│   ├── SiteIntel.js          ← Main app component
│   └── SiteIntel.module.css  ← All styles
├── .env.example              ← Copy to .env.local with your key
├── .gitignore
├── next.config.js
├── package.json
└── README.md
```

---

## ROADMAP

- [ ] Procore API integration (auto-log to project)
- [ ] PlanGrid blueprint markup
- [ ] Meta glasses direct photo upload
- [ ] Multi-photo report (walk the whole floor)
- [ ] QR code zone tagging
- [ ] Weekly progress comparison / trend tracking
- [ ] PDF report generation

---

## LOCAL DEVELOPMENT

```bash
# Install dependencies
npm install

# Create your env file
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# Run locally
npm run dev

# Open http://localhost:3000
```

---

Built with Next.js + Claude Vision API
