"""
Modular LLM service for answer extraction and processing.
Supports multiple providers: Ollama, OpenAI, etc.
Easy to swap models by changing configuration.
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional
import json
import ollama
from config import settings


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate text from prompt."""
        pass

    @abstractmethod
    def extract_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict:
        """Generate and parse JSON response."""
        pass


class OllamaProvider(LLMProvider):
    """Ollama LLM provider."""

    def __init__(self, model: str = None, base_url: str = None):
        self.model = model or settings.LLM_MODEL
        self.base_url = base_url or settings.LLM_BASE_URL
        self.temperature = settings.LLM_TEMPERATURE

    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate text using Ollama."""
        messages = []

        if system_prompt:
            messages.append({
                "role": "system",
                "content": system_prompt
            })

        messages.append({
            "role": "user",
            "content": prompt
        })

        response = ollama.chat(
            model=self.model,
            messages=messages,
            options={
                "temperature": self.temperature,
            }
        )

        return response['message']['content']

    def extract_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict:
        """Generate and parse JSON response."""
        full_system_prompt = (
            (system_prompt or "") +
            "\n\nYou MUST respond with valid JSON only. No other text."
        )

        response_text = self.generate(prompt, full_system_prompt)

        # Try to extract JSON from response
        try:
            # Remove markdown code blocks if present
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]

            return json.loads(response_text.strip())
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON: {response_text}")
            raise ValueError(f"LLM did not return valid JSON: {e}")


class LLMService:
    """
    Main LLM service that provides high-level methods.
    Automatically selects provider based on configuration.
    """

    def __init__(self):
        self.provider = self._get_provider()

    def _get_provider(self) -> LLMProvider:
        """Get LLM provider based on configuration."""
        provider_name = settings.LLM_PROVIDER.lower()

        if provider_name == "ollama":
            return OllamaProvider()
        # Easy to add more providers:
        # elif provider_name == "openai":
        #     return OpenAIProvider()
        else:
            raise ValueError(f"Unknown LLM provider: {provider_name}")

    def extract_answer_from_reddit(
        self,
        post_title: str,
        top_comments: List[str],
        op_username: str
    ) -> Dict:
        """
        Extract the answer and metadata from Reddit post and comments.

        Returns:
            {
                "answer": str,
                "category": str,
                "hints": List[str],
                "related_terms": List[str],
                "confidence": str
            }
        """
        system_prompt = """You are an expert at analyzing Reddit posts from r/whatisthisthing.
Your job is to extract the correct answer and useful metadata from solved posts."""

        prompt = f"""
Post Title: {post_title}

Top Comments (the answer is in here, often confirmed by OP "{op_username}"):
{chr(10).join(f"- {comment}" for comment in top_comments[:10])}

Extract the following information in JSON format:
{{
    "answer": "The exact name of the object (concise, 1-4 words)",
    "category": "One of: tool, device, organism, artifact, part, food, structure, other",
    "hints": [
        "General hint about category or era",
        "More specific hint about function or appearance",
        "Very specific hint that narrows it down"
    ],
    "related_terms": ["synonym1", "synonym2", "related_word1"],
    "confidence": "high/medium/low based on how clear the answer is"
}}

Important:
- The answer should be the most commonly accepted term
- Hints should be progressive (general → specific)
- Include 3-5 hints that help someone guess without giving it away immediately
- Related terms help with semantic matching
"""

        return self.provider.extract_json(prompt, system_prompt)

    def generate_hints_from_context(self, answer: str, context: str) -> List[str]:
        """Generate progressive hints given an answer and context."""
        system_prompt = "You generate helpful, progressive hints for a guessing game."

        prompt = f"""
Answer: {answer}
Context: {context}

Generate 5 progressive hints in JSON format:
{{
    "hints": [
        "Very general hint (category/era)",
        "Slightly more specific (function/use)",
        "More specific (appearance/size)",
        "Very specific (key feature)",
        "Almost giving it away"
    ]
}}
"""

        result = self.provider.extract_json(prompt, system_prompt)
        return result.get("hints", [])


# Global instance
llm_service = LLMService()
