import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching roles...');
  const { data: roles, error } = await supabase
    .from('store_roles')
    .select('id, name, permissions');

  if (error) {
    console.error('Error fetching roles:', error);
    process.exit(1);
  }

  console.log(`Found ${roles.length} roles.`);

  for (const role of roles) {
    let newPermissions = [];

    if (role.name === '점주') {
      newPermissions = [
        'manage_store', 'manage_roles', 'view_dashboard', 
        'view_staff', 'manage_staff', 'view_salary', 'manage_payroll',
        'view_schedule', 'manage_schedule', 'view_attendance', 'manage_attendance',
        'view_leave', 'manage_leave', 'view_tasks', 'manage_tasks',
        'view_sales', 'manage_inventory', 'manage_menu'
      ];
    } else if (role.name === '매니저') {
      newPermissions = [
        'view_dashboard', 'view_staff', 'view_schedule', 'manage_schedule',
        'view_attendance', 'view_leave', 'view_tasks', 'manage_tasks'
      ];
    } else if (role.name === '직원') {
      newPermissions = [
        'view_dashboard', 'view_staff', 'view_schedule', 'view_attendance', 'view_leave', 'view_tasks'
      ];
    } else {
      // Keep existing permissions if it's not a default role, or apply staff defaults if empty?
      // Just keep existing if we don't know the name.
      continue;
    }

    const { error: updateError } = await supabase
      .from('store_roles')
      .update({ permissions: newPermissions })
      .eq('id', role.id);

    if (updateError) {
      console.error(`Error updating role ${role.name} (${role.id}):`, updateError);
    } else {
      console.log(`Updated role ${role.name} (${role.id}) with ${newPermissions.length} permissions.`);
    }
  }

  console.log('Finished updating roles.');
}

main();