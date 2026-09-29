const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://oidamfhjfcgyisrcacgc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZGFtZmhqZmNneWlzcmNhY2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDUyNTQxMSwiZXhwIjoyMTA2MTAxNDExfQ.QtdkS02V1k2E9r5TRMJfDuXlS9RxXdrsHFIyi8tEOsI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupTestUsers() {
  console.log('Setting up test accounts...');
  
  const usersToCreate = [
    {
      email: 'monir@gmail.com',
      password: '12345678',
      role: 'admin',
      name: 'Monir Admin'
    },
    {
      email: 'customer@gmail.com',
      password: '12345678',
      role: 'customer',
      name: 'Test Customer'
    },
    {
      email: 'vendor@gmail.com',
      password: '12345678',
      role: 'vendor',
      name: 'Test Vendor'
    }
  ];

  for (const u of usersToCreate) {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true, // This skips sending the confirmation email and bypasses rate limits
      user_metadata: { role: u.role, full_name: u.name }
    });

    if (createError && createError.message.includes('already exists')) {
      console.log(`User ${u.email} already exists, updating password...`);
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const user = usersData.users.find(x => x.email === u.email);
      if (user) {
        await supabase.auth.admin.updateUserById(
          user.id,
          { 
            password: u.password,
            user_metadata: { role: u.role, full_name: u.name }
          }
        );
        console.log(`✅ Updated: ${u.email} (${u.role})`);
      }
    } else if (createError) {
      console.error(`❌ Failed to create ${u.email}:`, createError.message);
    } else {
      console.log(`✅ Created: ${u.email} (${u.role})`);
    }
  }
}

setupTestUsers();
