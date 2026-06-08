import 'dotenv/config';
import OpenAI from 'openai';
import { supabase } from '../db/supabase';
import { FAQ_CHUNKS } from './faqData';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

export async function seedFaq(): Promise<void> {
  // Load existing chunk content so we only embed and insert new entries.
  // This makes the seed additive — safe to re-run after adding new FAQ_CHUNKS.
  const { data: existing, error: fetchErr } = await supabase
    .from('faq_chunks')
    .select('content');

  if (fetchErr) {
    console.error('faq seed: could not fetch existing chunks:', fetchErr.message);
    return;
  }

  const existingContents = new Set(
    (existing ?? []).map((r) => (r as { content: string }).content)
  );

  const toInsert = FAQ_CHUNKS.filter((c) => !existingContents.has(c));

  if (toInsert.length === 0) {
    console.log(`faq_chunks up to date (${FAQ_CHUNKS.length} total) — nothing new to insert`);
    return;
  }

  console.log(
    `Seeding ${toInsert.length} new FAQ chunks (${existingContents.size} already present)…`
  );

  // Embed in batches of 20 to stay within API limits
  const batchSize = 20;
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const embeddings = await embedBatch(batch);

    const rows = batch.map((content, j) => ({
      content,
      embedding: embeddings[j] as unknown as string,
      metadata: { index: existingContents.size + i + j },
    }));

    const { error } = await supabase.from('faq_chunks').insert(rows);
    if (error) throw error;
    console.log(`  inserted rows ${i + 1}–${i + batch.length}`);
  }

  console.log('FAQ seed complete.');
}

// Allow running directly: ts-node src/seed/faq.ts
if (require.main === module) {
  seedFaq().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
