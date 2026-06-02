import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const envLines = envContent.split('\n');
  for (const line of envLines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = line.split('=')[1].trim();
  }
} catch (e) {
  console.log("Could not read .env.local", e);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log("Menjalankan seed database...");
  
  const usersToInsert = [
    {
      role: 'admin',
      full_name: 'Super Administrator',
      email: 'admin@agrigems.com',
      password_hash: 'admin123', // In production, this should be hashed
      is_active: true
    },
    {
      role: 'petani',
      full_name: 'Budi Petani',
      nik: '1234567890123456',
      email: 'petani@agrigems.com',
      password_hash: 'petani123',
      is_active: true
    },
    {
      role: 'mill',
      full_name: 'Staf Pabrik A',
      email: 'mill@agrigems.com',
      password_hash: 'mill123',
      is_active: true
    },
    {
      role: 'agent',
      full_name: 'Agen Logistik B',
      email: 'agent@agrigems.com',
      password_hash: 'agent123',
      is_active: true
    }
  ];

  for (const user of usersToInsert) {
    // Check if exists
    const { data: existing } = await supabase.from('users').select('*').eq('email', user.email).single();
    if (!existing) {
      const { error } = await supabase.from('users').insert(user);
      if (error) {
        console.error("Error inserting", user.email, error);
      } else {
        console.log("Berhasil insert:", user.email);
      }
    } else {
      console.log("User sudah ada:", user.email);
    }
  }
  
  console.log("Seed selesai.");
}

seed();
