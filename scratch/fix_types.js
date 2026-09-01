const fs = require('fs');
const path = require('path');

const files = [
  'src/app/[lang]/(public)/layout.tsx',
  'src/app/[lang]/(public)/page.tsx',
  'src/app/[lang]/(public)/policies/page.tsx',
  'src/app/[lang]/(public)/about/page.tsx',
  'src/app/[lang]/(public)/contact/page.tsx',
  'src/app/[lang]/(public)/catalog/page.tsx',
  'src/app/[lang]/(public)/machine/[id]/page.tsx'
];

files.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  let content = fs.readFileSync(fullPath, 'utf-8');
  
  // Thay thế type params
  content = content.replace(/lang:\s*'en'\s*\|\s*'vi'/g, 'lang: string');
  
  // Thay thế cast khi gọi getDictionary
  content = content.replace(/getDictionary\(resolvedParams\.lang\)/g, "getDictionary(resolvedParams.lang as 'en' | 'vi')");
  
  // Thay thế cast khi truyền lang vào các component trong layout
  if (file.includes('layout.tsx')) {
    content = content.replace(/lang=\{resolvedParams\.lang\}/g, "lang={resolvedParams.lang as 'en' | 'vi'}");
  }

  // cast trong page.tsx cho lang switcher
  if (file.includes('page.tsx')) {
      content = content.replace(/lang=\{resolvedParams\.lang\}/g, "lang={resolvedParams.lang as 'en' | 'vi'}");
  }
  
  fs.writeFileSync(fullPath, content);
  console.log('Fixed', file);
});
