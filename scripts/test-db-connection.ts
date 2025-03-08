import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { sampleCourses } from './sample-courses';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabaseConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase.from('courses').select('count');
    if (error) throw error;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function populateCourses() {
  try {
    console.log('Starting to populate courses...');
    
    // Check if courses already exist
    const { count } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true });
    
    if (count && count > 0) {
      console.log(`\n⚠️ Database already contains ${count} courses.`);
      const proceed = await askToProceed();
      if (!proceed) {
        console.log('❌ Aborting course population');
        return;
      }
      // Clear existing courses
      const { error: deleteError } = await supabase
        .from('courses')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteError) throw deleteError;
      console.log('✅ Cleared existing courses');
    }
    
    // Insert courses in batches of 10
    for (let i = 0; i < sampleCourses.length; i += 10) {
      const batch = sampleCourses.slice(i, i + 10);
      const { error } = await supabase
        .from('courses')
        .insert(batch);
      
      if (error) throw error;
      
      console.log(`✅ Added courses ${i + 1} to ${Math.min(i + 10, sampleCourses.length)}`);
    }
    
    // Verify courses were added
    const { data: courses, error: countError } = await supabase
      .from('courses')
      .select('*');
    
    if (countError) throw countError;
    
    console.log(`\nTotal courses in database: ${courses.length}`);
    console.log('\nSample of courses:');
    courses.slice(0, 5).forEach(course => {
      console.log(`- ${course.name} (${course.location})`);
    });
    
    console.log('\n✅ Courses populated successfully');
  } catch (error) {
    console.error('❌ Error populating courses:', error);
  }
}

// Helper function to ask for confirmation
async function askToProceed(): Promise<boolean> {
  if (process.stdin.isTTY) {
    process.stdout.write('Do you want to clear existing courses and add new data? (y/N): ');
    const response = await new Promise<string>(resolve => {
      process.stdin.once('data', data => {
        resolve(data.toString().trim().toLowerCase());
      });
    });
    return response === 'y';
  }
  return false;
}

async function main() {
  const isConnected = await testDatabaseConnection();
  if (isConnected) {
    await populateCourses();
  }
  process.exit(0);
}

main(); 