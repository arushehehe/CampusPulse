import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

// Load the root Next.js .env.local file
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  console.error("Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
  process.exit(1);
}

// Bypass RLS with the service role key
const supabase = createClient(supabaseUrl, supabaseKey);

// You can add your API key here or in .env.local later
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder-key',
});

async function processEmbeddingJobs() {
  console.log(`[${new Date().toISOString()}] Checking for pending embedding jobs...`);

  const { data: jobs, error } = await supabase
    .from('embedding_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) {
    console.error("❌ Error fetching embedding jobs:", error);
    return;
  }

  if (!jobs || jobs.length === 0) {
    return;
  }

  for (const job of jobs) {
    console.log(`⚙️ Processing job: ${job.id} for event ${job.entity_id}`);

    // Mark as processing
    await supabase
      .from('embedding_jobs')
      .update({ status: 'processing', attempts: (job.attempts || 0) + 1 })
      .eq('id', job.id);

    try {
      // 1. Fetch event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('title, description, category, location')
        .eq('id', job.entity_id)
        .single();

      if (eventError || !event) throw new Error("Event not found");

      // Construct a string to embed
      const textToEmbed = `Title: ${event.title}\nCategory: ${event.category}\nLocation: ${event.location || 'TBA'}\nDescription: ${event.description || ''}`;

      console.log("-> 🧠 Calling OpenAI Embeddings API (Stubbed)...");
      
      // TODO: Uncomment when you have an active OpenAI API key
      // const response = await openai.embeddings.create({
      //   model: "text-embedding-3-small",
      //   input: textToEmbed,
      //   dimensions: 1536,
      // });
      // const embedding = response.data[0].embedding;

      // Simulate a 1536-dimensional embedding
      const embedding = Array(1536).fill(0).map(() => Math.random() * 0.1);
      
      // 2. Upsert into event_embeddings
      const { error: upsertError } = await supabase
        .from('event_embeddings')
        .upsert({
          event_id: job.entity_id,
          embedding: embedding,
          content_hash: "stubbed-hash-" + Date.now(), // Real implementation should hash textToEmbed
          embedded_at: new Date().toISOString()
        });

      if (upsertError) throw upsertError;

      // 3. Mark job as completed
      await supabase
        .from('embedding_jobs')
        .update({ status: 'completed', error: null })
        .eq('id', job.id);

      console.log(`✅ Successfully completed embedding for event ${job.entity_id}`);

    } catch (err) {
      console.error(`❌ Failed to process job ${job.id}:`, err);
      // Mark as failed
      await supabase
        .from('embedding_jobs')
        .update({ 
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error'
        })
        .eq('id', job.id);
    }
  }
}

// Poll every 10 seconds
setInterval(processEmbeddingJobs, 10000);
console.log("🚀 Embedding worker started. Polling every 10s...");
processEmbeddingJobs();
