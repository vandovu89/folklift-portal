const fs = require('fs');
const path = require('path');

const files = [
  "src/lib/gemini.ts",
  "src/app/[lang]/admin/page.tsx",
  "src/app/[lang]/admin/forklifts/ForkliftTable.tsx",
  "src/app/[lang]/admin/forklifts/[id]/edit/page.tsx",
  "src/app/[lang]/admin/forklifts/ForkliftFilter.tsx",
  "src/app/[lang]/admin/forklifts/add/page.tsx",
  "src/app/[lang]/(public)/page.tsx",
  "src/app/[lang]/(public)/machine/[id]/page.tsx",
  "src/app/[lang]/(public)/catalog/page.tsx",
  "prisma/schema.prisma",
  "src/app/api/forklifts/route.ts",
  "src/app/api/forklifts/import/route.ts"
];

files.forEach(f => {
  const p = path.join(__dirname, f);
  if(fs.existsSync(p)) {
    let content = fs.readFileSync(p);
    if(content.length >= 3 && content[0] === 0xEF && content[1] === 0xBB && content[2] === 0xBF) {
      content = content.slice(3);
      fs.writeFileSync(p, content);
      console.log('Removed BOM from ' + f);
    }
  }
});
