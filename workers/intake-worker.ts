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

async function processPendingIngestions() {
  console.log(`[${new Date().toISOString()}] Checking for pending ingestions...`);

  const { data: ingestions, error } = await supabase
    .from('event_ingestions')
    .select('*')
    .eq('extraction_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5);

  if (error) {
    console.error("❌ Error fetching ingestions:", error);
    return;
  }

  if (!ingestions || ingestions.length === 0) {
    return;
  }

  for (const ingestion of ingestions) {
    console.log(`⚙️ Processing ingestion: ${ingestion.id}`);

    // Mark as processing
    await supabase
      .from('event_ingestions')
      .update({ extraction_status: 'processing' })
      .eq('id', ingestion.id);

    try {
      console.log("-> 🧠 Calling OpenAI Vision API (Stubbed)...");

      // TODO: Call OpenAI Vision API with poster_url or source_url to extract details.
      // const response = await openai.chat.completions.create({
      //   model: "gpt-4o",
      //   messages: [
      //     {
      //       role: "user",
      //       content: "Extract event details from this poster/url.",
      //     }
      //   ],
      // });
      
      // Simulate extraction logic mapping to the events table
      const extractedEvent = {
        title: "Draft Extracted Event from Intake",
        description: ingestion.notes || "No description provided.",
        category: "Entertainment", // Stubbed category
        start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        end_time: new Date(Date.now() + 90000000).toISOString(),
        location: "Campus",
        poster_url: ingestion.poster_url,
        source_url: ingestion.source_url,
        source_type: "community",
        status: "pending", // Always create as a pending draft for admin review
        created_by: ingestion.submitted_by,
      };

      // 1. Insert the draft event
      const { data: event, error: insertError } = await supabase
        .from('events')
        .insert(extractedEvent)
        .select('id')
        .single();

      if (insertError) throw insertError;

      // 2. Mark ingestion as extracted
      await supabase
        .from('event_ingestions')
        .update({ 
          extraction_status: 'extracted',
          extracted_event_id: event.id
        })
        .eq('id', ingestion.id);

      console.log(`✅ Successfully extracted event ${event.id}`);

    } catch (err) {
      console.error(`❌ Failed to process ingestion ${ingestion.id}:`, err);
      // Mark as failed
      await supabase
        .from('event_ingestions')
        .update({ 
          extraction_status: 'failed',
          extraction_error: err instanceof Error ? err.message : 'Unknown error'
        })
        .eq('id', ingestion.id);
    }
  }
}

// Poll every 10 seconds
setInterval(processPendingIngestions, 10000);
console.log("🚀 Smart Intake worker started. Polling every 10s...");
processPendingIngestions();
