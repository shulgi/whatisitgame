/**
 * API Route: GET /api/admin/curate
 * Curate puzzles from Reddit (processes 1 post per request)
 *
 * Due to serverless timeout limits, this processes ONE post at a time.
 * Call multiple times to add more puzzles.
 *
 * Usage:
 * https://your-app.vercel.app/api/admin/curate
 * https://your-app.vercel.app/api/admin/curate?limit=5
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Helper: Fetch Reddit posts
async function fetchRedditPosts(limit: number = 50) {
  const url = `https://www.reddit.com/r/whatisthisthing/search.json?q=flair:Solved&sort=top&t=month&limit=${limit}&restrict_sr=on`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'web:whatisitgame:v1.0.0 (by /u/WhatIsItGameBot)',
      'Accept': 'application/json'
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Reddit API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data.children.map((child: any) => child.data);
}

// Helper: Get image URL
function getImageUrl(post: any): string | null {
  const url = post.url;

  if (url.match(/\.(jpg|jpeg|png|gif)$/i)) return url;
  if (url.includes('i.redd.it') || url.includes('i.imgur.com')) return url;
  if (post.preview?.images?.[0]?.source?.url) {
    return post.preview.images[0].source.url.replace(/&amp;/g, '&');
  }

  return null;
}

// Helper: Fetch comments
async function fetchComments(postId: string) {
  const url = `https://www.reddit.com/r/whatisthisthing/comments/${postId}.json?limit=20`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'web:whatisitgame:v1.0.0 (by /u/WhatIsItGameBot)',
      'Accept': 'application/json'
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Reddit comments API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (data.length < 2) return [];

  const comments = data[1].data.children
    .map((child: any) => child.data)
    .filter((c: any) =>
      c.author !== 'AutoModerator' &&
      c.author !== '[deleted]' &&
      c.body &&
      c.body !== '[removed]'
    )
    .sort((a: any, b: any) => b.score - a.score);

  return comments.slice(0, 20);
}

// Helper: Call Groq LLM
async function extractWithGroq(postTitle: string, comments: any[], opUsername: string) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

  const commentTexts = comments.slice(0, 10).map((c: any) => c.body);

  const systemPrompt = 'You are an expert at analyzing Reddit posts from r/whatisthisthing. Extract answers and metadata in JSON format. Always respond with valid JSON only.';

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
    "related_terms": ["synonym1", "synonym2"],
    "confidence": "high/medium/low"
}

Respond with ONLY valid JSON, no other text.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// Helper: Get embedding
async function getEmbedding(text: string) {
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
  const HF_API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

  const headers: any = { 'Content-Type': 'application/json' };
  if (HF_API_KEY) headers['Authorization'] = `Bearer ${HF_API_KEY}`;

  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      inputs: text.toLowerCase().trim(),
      options: { wait_for_model: true },
    }),
  });

  if (!response.ok && response.status === 503) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return getEmbedding(text);
  }

  if (!response.ok) throw new Error(`HF API error: ${response.status}`);

  const embedding = await response.json();
  return Array.isArray(embedding[0]) ? embedding[0] : embedding;
}

// Main handler
export async function GET(request: Request) {
  const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    return NextResponse.json({
      success: false,
      error: 'Missing database connection string',
      details: 'Please connect a Neon Postgres database in Vercel Storage settings.'
    }, { status: 500 });
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1');
    const batchSize = Math.min(limit, 2); // Process max 2 at a time to avoid timeout

    // Fetch Reddit posts
    const posts = await fetchRedditPosts(100);
    const solvedPosts = posts.filter((post: any) => {
      const flair = (post.link_flair_text || '').toLowerCase();
      return flair.includes('solved') && post.score >= 10;
    });

    let processed = 0;
    let added = 0;
    const results = [];

    for (const post of solvedPosts.slice(0, batchSize)) {
      const postId = post.id;

      // Add delay to avoid rate limiting (Reddit allows ~60 requests/min)
      if (processed > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Check if exists
      const existing = await pool.query('SELECT id FROM puzzles WHERE reddit_post_id = $1', [postId]);
      if (existing.rows.length > 0) {
        results.push({ postId, status: 'skipped', reason: 'already exists' });
        processed++;
        continue;
      }

      // Get image
      const imageUrl = getImageUrl(post);
      if (!imageUrl) {
        results.push({ postId, status: 'skipped', reason: 'no image' });
        processed++;
        continue;
      }

      // Get comments
      const comments = await fetchComments(postId);
      if (comments.length === 0) {
        results.push({ postId, status: 'skipped', reason: 'no comments' });
        processed++;
        continue;
      }

      // Extract answer with Groq
      const extracted = await extractWithGroq(post.title, comments, post.author);
      if (!extracted || !extracted.answer || extracted.confidence === 'low') {
        results.push({ postId, status: 'skipped', reason: 'low confidence or no answer' });
        processed++;
        continue;
      }

      // Get embedding
      const answerEmbedding = await getEmbedding(extracted.answer);

      // Save to database
      const context = comments.slice(0, 3).map((c: any) => c.body).join('\n');

      await pool.query(
        `INSERT INTO puzzles (
          reddit_post_id, reddit_url, image_url, post_title,
          answer, category, difficulty, hints, related_terms,
          extracted_context, answer_embedding, upvotes, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          postId,
          'https://reddit.com' + post.permalink,
          imageUrl,
          post.title,
          extracted.answer,
          extracted.category,
          'medium',
          JSON.stringify(extracted.hints || []),
          JSON.stringify(extracted.related_terms || []),
          context,
          JSON.stringify(answerEmbedding),
          post.score || 0,
          true
        ]
      );

      results.push({
        postId,
        status: 'added',
        answer: extracted.answer,
        category: extracted.category
      });
      added++;
      processed++;
    }

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM puzzles');
    const totalPuzzles = parseInt(countResult.rows[0].count);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} posts, added ${added} new puzzles`,
      total_puzzles: totalPuzzles,
      results,
      next_step: totalPuzzles < 10
        ? 'Call this endpoint again to add more puzzles'
        : 'You have enough puzzles! Game is ready to play.'
    });

  } catch (error: any) {
    console.error('Curation error:', error);
    await pool.end();

    // Special handling for Reddit 403 errors
    if (error.message.includes('403')) {
      return NextResponse.json({
        success: false,
        error: 'Reddit API blocked the request (403 Forbidden)',
        details: 'Reddit may be blocking requests from Vercel serverless functions. Try again in a few minutes, or run the curation script locally using: node scripts-node/curate.js',
        reddit_blocked: true
      }, { status: 503 });
    }

    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'Check Vercel logs for full error details'
    }, { status: 500 });
  }
}
