const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://oidamfhjfcgyisrcacgc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZGFtZmhqZmNneWlzcmNhY2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDUyNTQxMSwiZXhwIjoyMTA2MTAxNDExfQ.QtdkS02V1k2E9r5TRMJfDuXlS9RxXdrsHFIyi8tEOsI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function updateAdmin() {
  console.log('Creating/Updating admin user...');
  
  // First try to create the user
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: 'monir@gmail.com',
    password: '12345678',
    email_confirm: true,
    user_metadata: { role: 'admin', full_name: 'Monir Admin' }
  });

  if (createError) {
    if (createError.message.includes('already exists')) {
      console.log('User already exists, updating password and role...');
      
      // We need the user ID to update them
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('Failed to list users:', listError);
        return;
      }
      
      const user = usersData.users.find(u => u.email === 'monir@gmail.com');
      if (user) {
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          { 
            password: '12345678',
            user_metadata: { role: 'admin', full_name: 'Monir Admin' }
          }
        );
        
        if (updateError) {
          console.error('Error updating user:', updateError);
        } else {
          console.log('Successfully updated user password and metadata!');
        }
      }
    } else {
      console.error('Error creating user:', createError);
    }
  } else {
    console.log('Successfully created new admin user!');
  }
}

updateAdmin();
