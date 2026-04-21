import fs from 'fs';

const files = [
  'src/app/dashboard/attendance/page.tsx',
  'src/app/dashboard/settings/page.tsx',
  'src/app/dashboard/schedule/page.tsx',
  'src/app/dashboard/my-tasks/page.tsx',
  'src/app/dashboard/roles/page.tsx',
  'src/app/dashboard/staff/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/dashboard/leave/page.tsx',
  'src/app/account/page.tsx',
  'src/features/schedule/task-actions.ts',
  'src/features/auth/permissions.ts',
  'src/features/staff/actions.ts',
  'src/features/store/actions.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  // 강제 치환 (안전하게 \brole\b 만)
  let original = content;
  
  // .select('role') -> .select('role_id')
  content = content.replace(/\.select\(\s*['"`]role['"`]\s*\)/g, ".select('role_id')");
  
  // .select('role, ...')
  content = content.replace(/\.select\(\s*['"`]role,\s*/g, ".select('");
  
  // .select('..., role, ...')
  content = content.replace(/,\s*role,\s*/g, ", ");
  
  // .select('  // .select('  // .select('  // .select(,\  // .select('  // .select('  // .s혹시  // .select('  // .select('  // .selecto  // .select('  // .select('  // .selecnt = content.replace(/role:store_roles/g  // .select('  // .select('  // .se(o  // .select('  // .select('  writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}   
  }
}
