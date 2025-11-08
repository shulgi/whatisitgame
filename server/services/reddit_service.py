"""
Reddit scraper service for fetching and processing posts.
Handles both authenticated and unauthenticated requests.
"""
import requests
from typing import List, Dict, Optional
import time
from config import settings


class RedditService:
    """
    Service for fetching data from Reddit.
    Uses JSON API (no authentication needed for read-only access).
    """

    def __init__(self):
        self.base_url = "https://www.reddit.com"
        self.headers = {
            "User-Agent": settings.REDDIT_USER_AGENT
        }

    def get_solved_posts(
        self,
        subreddit: str = None,
        limit: int = None,
        min_upvotes: int = None
    ) -> List[Dict]:
        """
        Fetch solved posts from subreddit.

        Args:
            subreddit: Subreddit name (default from settings)
            limit: Max number of posts to fetch
            min_upvotes: Minimum upvotes filter

        Returns:
            List of post dictionaries
        """
        subreddit = subreddit or settings.SUBREDDIT
        limit = limit or settings.MAX_POSTS_PER_SCRAPE
        min_upvotes = min_upvotes or settings.MIN_UPVOTES

        posts = []
        after = None

        while len(posts) < limit:
            # Fetch posts
            url = f"{self.base_url}/r/{subreddit}/search.json"
            params = {
                "q": "flair:Solved OR flair:solved",
                "sort": "top",
                "t": "month",
                "limit": 100,
                "restrict_sr": "on",
            }

            if after:
                params["after"] = after

            try:
                response = requests.get(
                    url,
                    headers=self.headers,
                    params=params,
                    timeout=10
                )
                response.raise_for_status()
                data = response.json()

                children = data.get("data", {}).get("children", [])

                if not children:
                    break

                for child in children:
                    post_data = child.get("data", {})

                    # Filter criteria
                    if post_data.get("score", 0) < min_upvotes:
                        continue

                    # Must have image
                    if not self._has_image(post_data):
                        continue

                    # Must be solved
                    link_flair = post_data.get("link_flair_text", "").lower()
                    if "solved" not in link_flair and "likely solved" not in link_flair:
                        continue

                    posts.append(self._format_post(post_data))

                    if len(posts) >= limit:
                        break

                # Pagination
                after = data.get("data", {}).get("after")
                if not after:
                    break

                # Rate limiting
                time.sleep(2)

            except requests.RequestException as e:
                print(f"Error fetching Reddit data: {e}")
                break

        return posts

    def _has_image(self, post_data: Dict) -> bool:
        """Check if post has an image."""
        # Check if it's an image post
        url = post_data.get("url", "")

        # Direct image links
        if any(url.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif']):
            return True

        # Reddit image hosting
        if "i.redd.it" in url or "i.imgur.com" in url:
            return True

        # Gallery posts
        if post_data.get("is_gallery"):
            return True

        return False

    def _format_post(self, post_data: Dict) -> Dict:
        """Format post data into standardized structure."""
        return {
            "reddit_post_id": post_data.get("id"),
            "reddit_url": f"https://reddit.com{post_data.get('permalink')}",
            "title": post_data.get("title"),
            "image_url": self._get_image_url(post_data),
            "upvotes": post_data.get("score", 0),
            "comment_count": post_data.get("num_comments", 0),
            "created_utc": post_data.get("created_utc"),
            "author": post_data.get("author"),
            "link_flair": post_data.get("link_flair_text"),
        }

    def _get_image_url(self, post_data: Dict) -> str:
        """Extract image URL from post data."""
        url = post_data.get("url", "")

        # Direct image
        if any(url.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif']):
            return url

        # Reddit/Imgur hosting
        if "i.redd.it" in url or "i.imgur.com" in url:
            return url

        # Gallery - get first image
        if post_data.get("is_gallery"):
            gallery_data = post_data.get("gallery_data", {})
            items = gallery_data.get("items", [])
            if items:
                media_id = items[0].get("media_id")
                media_metadata = post_data.get("media_metadata", {})
                if media_id in media_metadata:
                    image_data = media_metadata[media_id]
                    source = image_data.get("s", {})
                    return source.get("u", "").replace("&amp;", "&")

        # Preview images
        preview = post_data.get("preview", {})
        images = preview.get("images", [])
        if images:
            source = images[0].get("source", {})
            return source.get("url", "").replace("&amp;", "&")

        return url

    def get_post_comments(
        self,
        subreddit: str,
        post_id: str,
        limit: int = 20
    ) -> List[Dict]:
        """
        Fetch top comments for a post.

        Args:
            subreddit: Subreddit name
            post_id: Reddit post ID
            limit: Number of top comments to fetch

        Returns:
            List of comment dictionaries
        """
        url = f"{self.base_url}/r/{subreddit}/comments/{post_id}.json"

        try:
            response = requests.get(
                url,
                headers=self.headers,
                params={"limit": limit},
                timeout=10
            )
            response.raise_for_status()
            data = response.json()

            # Comments are in second element of response
            if len(data) < 2:
                return []

            comments_data = data[1].get("data", {}).get("children", [])
            comments = []

            for comment_child in comments_data:
                comment_data = comment_child.get("data", {})

                # Skip automoderator and deleted
                if comment_data.get("author") in ["AutoModerator", "[deleted]"]:
                    continue

                body = comment_data.get("body", "")
                if not body or body == "[removed]":
                    continue

                comments.append({
                    "author": comment_data.get("author"),
                    "body": body,
                    "score": comment_data.get("score", 0),
                    "is_op": comment_data.get("is_submitter", False),
                })

            # Sort by score
            comments.sort(key=lambda x: x["score"], reverse=True)

            return comments[:limit]

        except requests.RequestException as e:
            print(f"Error fetching comments: {e}")
            return []


# Global instance
reddit_service = RedditService()
