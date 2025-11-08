#!/usr/bin/env python3
"""
Data curation script for fetching and processing Reddit posts.
This script should be run periodically to populate the database with new puzzles.

Usage:
    python scripts/curate_posts.py --limit 50
"""
import sys
import os
from pathlib import Path

# Add server directory to path
server_path = Path(__file__).parent.parent / "server"
sys.path.insert(0, str(server_path))

import argparse
from sqlalchemy.orm import Session

from database import SessionLocal, init_db
from models.puzzle import Puzzle
from services.reddit_service import reddit_service
from services.llm_service import llm_service
from services.embedding_service import embedding_service
from config import settings


def process_post(post_data: dict, db: Session) -> bool:
    """
    Process a single Reddit post and add to database.

    Args:
        post_data: Post data from Reddit
        db: Database session

    Returns:
        True if successfully processed, False otherwise
    """
    reddit_post_id = post_data["reddit_post_id"]

    # Check if already exists
    existing = db.query(Puzzle).filter(
        Puzzle.reddit_post_id == reddit_post_id
    ).first()

    if existing:
        print(f"  ⏭️  Skipping {reddit_post_id} (already exists)")
        return False

    print(f"  🔄 Processing {reddit_post_id}...")

    try:
        # Fetch comments
        comments = reddit_service.get_post_comments(
            settings.SUBREDDIT,
            reddit_post_id,
            limit=20
        )

        if not comments:
            print(f"  ❌ No comments found for {reddit_post_id}")
            return False

        # Extract answer using LLM
        comment_texts = [c["body"] for c in comments]
        op_username = post_data.get("author", "")

        print(f"     - Extracting answer with LLM ({settings.LLM_MODEL})...")
        extracted_data = llm_service.extract_answer_from_reddit(
            post_title=post_data["title"],
            top_comments=comment_texts,
            op_username=op_username
        )

        answer = extracted_data.get("answer")
        if not answer:
            print(f"  ❌ Could not extract answer from {reddit_post_id}")
            return False

        # Check confidence
        confidence = extracted_data.get("confidence", "low")
        if confidence == "low":
            print(f"  ⚠️  Low confidence answer for {reddit_post_id}, skipping")
            return False

        # Generate embedding for answer
        print(f"     - Generating embedding for '{answer}'...")
        answer_embedding = embedding_service.get_embedding(answer)

        # Create combined context from top comments
        context_comments = [c["body"] for c in comments[:3]]
        extracted_context = "\n".join(context_comments)

        # Create puzzle entry
        puzzle = Puzzle(
            reddit_post_id=reddit_post_id,
            reddit_url=post_data["reddit_url"],
            image_url=post_data["image_url"],
            post_title=post_data["title"],
            answer=answer,
            category=extracted_data.get("category", "other"),
            difficulty="medium",  # Could be enhanced with more logic
            hints=extracted_data.get("hints", []),
            related_terms=extracted_data.get("related_terms", []),
            extracted_context=extracted_context,
            answer_embedding=answer_embedding,
            upvotes=post_data.get("upvotes", 0),
            comment_count=post_data.get("comment_count", 0),
            llm_model_used=settings.LLM_MODEL,
            embedding_model_used=settings.EMBEDDING_MODEL,
            is_active=True
        )

        db.add(puzzle)
        db.commit()

        print(f"  ✅ Added '{answer}' ({puzzle.category})")
        return True

    except Exception as e:
        print(f"  ❌ Error processing {reddit_post_id}: {e}")
        db.rollback()
        return False


def curate_posts(limit: int = 50, skip_existing: bool = True):
    """
    Main curation function.

    Args:
        limit: Maximum number of posts to process
        skip_existing: Skip posts already in database
    """
    print(f"\n{'='*60}")
    print(f"What Is It? - Data Curation Script")
    print(f"{'='*60}\n")

    # Initialize database
    print("Initializing database...")
    init_db()

    # Create session
    db = SessionLocal()

    try:
        # Fetch posts from Reddit
        print(f"\n📥 Fetching up to {limit} solved posts from r/{settings.SUBREDDIT}...")
        posts = reddit_service.get_solved_posts(limit=limit * 2)  # Fetch extra for filtering
        print(f"   Found {len(posts)} posts with images\n")

        # Process each post
        processed_count = 0
        success_count = 0

        for i, post in enumerate(posts):
            if processed_count >= limit:
                break

            print(f"[{i+1}/{len(posts)}] {post['title'][:60]}...")

            success = process_post(post, db)
            processed_count += 1

            if success:
                success_count += 1

        print(f"\n{'='*60}")
        print(f"✨ Curation Complete!")
        print(f"   Processed: {processed_count} posts")
        print(f"   Added: {success_count} new puzzles")
        print(f"{'='*60}\n")

        # Show database stats
        total_puzzles = db.query(Puzzle).count()
        active_puzzles = db.query(Puzzle).filter(Puzzle.is_active == True).count()
        print(f"📊 Database Stats:")
        print(f"   Total puzzles: {total_puzzles}")
        print(f"   Active puzzles: {active_puzzles}\n")

    finally:
        db.close()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Curate puzzles from Reddit r/whatisthisthing"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="Maximum number of posts to process (default: 50)"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Test mode - only process 5 posts"
    )

    args = parser.parse_args()

    limit = 5 if args.test else args.limit

    if args.test:
        print("\n🧪 Running in TEST mode (5 posts only)\n")

    curate_posts(limit=limit)


if __name__ == "__main__":
    main()
