/**
 * Data curation script for Node.js
 *
 * This script runs LOCALLY (not on Vercel) to:
 * 1. Fetch Reddit posts from r/whatisthisthing
 * 2. Use Ollama (local LLM) to extract answers
 * 3. Generate embeddings using Hugging Face API
 * 4. Store in Vercel Postgres database
 *
 * Usage:
 *   node scripts-node/curate.js --limit 10
 */

require('dotenv').config();
const { sql } = require('@vercel/postgres');
const ollama = require('ollama').default;

// Simple Reddit API client (no auth needed for read-only)
async function fetchRedditPosts(limit = 50) {
  const url = `https://www.reddit.com/r/whatisthisthing/search.json?q=flair:Solved&sort=top&t=month&limit=${limit}&restrict_sr=on`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'WhatIsItGame/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Reddit API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data.children.map(child => child.data);
}

// Extract image URL from Reddit post
function getImageUrl(post) {
  const url = post.url;

  // Direct image
  if (url.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return url;
  }

  // Reddit/Imgur hosting
  if (url.includes('i.redd.it') || url.includes('i.imgur.com')) {
    return url;
  }

  // Preview images
  if (post.preview?.images?.[0]?.source?.url) {
    return post.preview.images[0].source.url.replace(/&amp;/g, '&');
  }

  return null;
}

// Fetch comments for a post
async function fetchComments(postId) {
  const url = `https://www.reddit.com/r/whatisthisthing/comments/${postId}.json?limit=20`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'WhatIsItGame/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Reddit comments API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.length < 2) return [];

  const comments = data[1].data.children
    .map(child => child.data)
    .filter(c => c.author !== 'AutoModerator' && c.author !== '[deleted]' && c.body && c.body !== '[removed]')
    .map(c => ({
      author: c.author,
      body: c.body,
      score: c.score || 0,
      is_submitter: c.is_submitter || false,
    }))
    .sort((a, b) => b.score - a.score);

  return comments.slice(0, 20);
}

// Extract answer using Ollama
async function extractAnswerWithLLM(postTitle, comments, opUsername) {
  const commentTexts = comments.slice(0, 10).map(c => c.body);

  const prompt = `Post Title: ${postTitle}

Top Comments (the answer is in here, often confirmed by OP "${opUsername}"):
${commentTexts.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Extract the following information in JSON format:
{
    "answer": "The exact name of the object (concise, 1-4 words)",
    "category": "One of: tool, device, organism, artifact, part, food, structure, other",
    "hints": [
        "General hint about category or era",
        "More specific hint about function or appearance",
        "Very specific hint that narrows it down"
    ],
    "related_terms": ["synonym1", "synonym2", "related_word1"],
    "confidence": "high/medium/low based on how clear the answer is"
}

Important:
- The answer should be the most commonly accepted term
- Hints should be progressive (general → specific)
- Include 3-5 hints that help someone guess without giving it away immediately
- Related terms help with semantic matching

Respond with ONLY valid JSON, no other text.`;

  try {
    const response = await ollama.chat({
      model: process.env.LLM_MODEL || 'llama3.2',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing Reddit posts from r/whatisthisthing. Extract answers and metadata in JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      format: 'json',
    });

    const result = JSON.parse(response.message.content);
    return result;
  } catch (error) {
    console.error('Error with Ollama:', error);
    return null;
  }
}

// Get embedding from Hugging Face
async function getEmbedding(text) {
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
  const HF_API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

  const headers = {
    'Content-Type': 'application/json',
  };

  if (HF_API_KEY) {
    headers['Authorization'] = `Bearer ${HF_API_KEY}`;
  }

  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      inputs: text.toLowerCase().trim(),
      options: { wait_for_model: true },
    }),
  });

  if (!response.ok) {
    // Retry once if model is loading
    if (response.status === 503) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return getEmbedding(text);
    }
    throw new Error(`HF API error: ${response.status}`);
  }

  const embedding = await response.json();
  return Array.isArray(embedding[0]) ? embedding[0] : embedding;
}

// Main curation function
async function curatePost(post) {
  const postId = post.id;

  console.log(`\n[${postId}] ${post.title.substring(0, 60)}...`);

  // Check if already processed
  const existing = await sql`
    SELECT id FROM puzzles WHERE reddit_post_id = ${postId}
  `;

  if (existing.rows.length > 0) {
    console.log(`  ⏭️  Already exists, skipping`);
    return false;
  }

  // Get image URL
  const imageUrl = getImageUrl(post);
  if (!imageUrl) {
    console.log(`  ❌ No image found`);
    return false;
  }

  // Fetch comments
  console.log(`  🔍 Fetching comments...`);
  const comments = await fetchComments(postId);

  if (comments.length === 0) {
    console.log(`  ❌ No comments found`);
    return false;
  }

  // Extract answer with LLM
  console.log(`  🤖 Extracting answer with Ollama...`);
  const extracted = await extractAnswerWithLLM(post.title, comments, post.author);

  if (!extracted || !extracted.answer) {
    console.log(`  ❌ Could not extract answer`);
    return false;
  }

  if (extracted.confidence === 'low') {
    console.log(`  ⚠️  Low confidence, skipping`);
    return false;
  }

  console.log(`  ✅ Answer: "${extracted.answer}"`);

  // Generate embedding
  console.log(`  🔢 Generating embedding...`);
  const answerEmbedding = await getEmbedding(extracted.answer);

  // Insert into database
  console.log(`  💾 Saving to database...`);

  const context = comments.slice(0, 3).map(c => c.body).join('\n');

  await sql`
    INSERT INTO puzzles (
      reddit_post_id, reddit_url, image_url, post_title,
      answer, category, difficulty, hints, related_terms,
      extracted_context, answer_embedding, upvotes, is_active
    ) VALUES (
      ${postId},
      ${'https://reddit.com' + post.permalink},
      ${imageUrl},
      ${post.title},
      ${extracted.answer},
      ${extracted.category},
      'medium',
      ${JSON.stringify(extracted.hints || [])},
      ${JSON.stringify(extracted.related_terms || [])},
      ${context},
      ${JSON.stringify(answerEmbedding)},
      ${post.score || 0},
      true
    )
  `;

  console.log(`  ✅ Successfully added!`);
  return true;
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10;

  console.log('═'.repeat(60));
  console.log('What Is It? - Data Curation Script (Node.js)');
  console.log('═'.repeat(60));
  console.log();

  console.log(`📥 Fetching up to ${limit} posts from r/whatisthisthing...`);
  const posts = await fetchRedditPosts(limit * 2);

  // Filter for posts with solved flair
  const solvedPosts = posts.filter(post => {
    const flair = (post.link_flair_text || '').toLowerCase();
    return flair.includes('solved') && post.score >= 10;
  });

  console.log(`   Found ${solvedPosts.length} solved posts`);
  console.log();

  let processed = 0;
  let added = 0;

  for (const post of solvedPosts.slice(0, limit)) {
    try {
      const success = await curatePost(post);
      if (success) added++;
      processed++;
    } catch (error) {
      console.error(`  ❌ Error:`, error.message);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log();
  console.log('═'.repeat(60));
  console.log('✨ Curation Complete!');
  console.log(`   Processed: ${processed} posts`);
  console.log(`   Added: ${added} new puzzles`);
  console.log('═'.repeat(60));
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { curatePost, fetchRedditPosts };
