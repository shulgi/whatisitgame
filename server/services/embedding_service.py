"""
Modular embedding service for semantic similarity.
Supports multiple providers: Sentence Transformers, OpenAI, etc.
Easy to swap models by changing configuration.
"""
from abc import ABC, abstractmethod
from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer
from config import settings


class EmbeddingProvider(ABC):
    """Abstract base class for embedding providers."""

    @abstractmethod
    def encode(self, text: str) -> List[float]:
        """Encode text to embedding vector."""
        pass

    @abstractmethod
    def encode_batch(self, texts: List[str]) -> List[List[float]]:
        """Encode multiple texts to embedding vectors."""
        pass


class SentenceTransformerProvider(EmbeddingProvider):
    """Sentence Transformers embedding provider."""

    def __init__(self, model_name: str = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self.model = None
        self._load_model()

    def _load_model(self):
        """Lazy load the model."""
        if self.model is None:
            print(f"Loading embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            print("Model loaded successfully")

    def encode(self, text: str) -> List[float]:
        """Encode single text to embedding."""
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def encode_batch(self, texts: List[str]) -> List[List[float]]:
        """Encode multiple texts to embeddings."""
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()


class EmbeddingService:
    """
    Main embedding service that provides high-level methods.
    Automatically selects provider based on configuration.
    """

    def __init__(self):
        self.provider = self._get_provider()

    def _get_provider(self) -> EmbeddingProvider:
        """Get embedding provider based on configuration."""
        provider_name = settings.EMBEDDING_PROVIDER.lower()

        if provider_name == "sentence-transformers":
            return SentenceTransformerProvider()
        # Easy to add more providers:
        # elif provider_name == "openai":
        #     return OpenAIProvider()
        else:
            raise ValueError(f"Unknown embedding provider: {provider_name}")

    def get_embedding(self, text: str) -> List[float]:
        """Get embedding for a single text."""
        return self.provider.encode(text.lower().strip())

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for multiple texts."""
        processed_texts = [t.lower().strip() for t in texts]
        return self.provider.encode_batch(processed_texts)

    def calculate_similarity(
        self,
        embedding1: List[float],
        embedding2: List[float]
    ) -> float:
        """
        Calculate cosine similarity between two embeddings.
        Returns value between 0 and 1.
        """
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)

        # Cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        similarity = dot_product / (norm1 * norm2)

        # Ensure between 0 and 1
        return float(max(0, min(1, similarity)))

    def get_similarity_score(
        self,
        text1: str,
        text2: str
    ) -> float:
        """
        Calculate similarity between two texts.
        Returns percentage (0-100).
        """
        emb1 = self.get_embedding(text1)
        emb2 = self.get_embedding(text2)
        similarity = self.calculate_similarity(emb1, emb2)
        return similarity * 100

    def get_temperature_label(self, similarity_percentage: float) -> str:
        """
        Convert similarity percentage to temperature label.
        """
        if similarity_percentage >= 90:
            return "🔥🔥🔥 VERY HOT!"
        elif similarity_percentage >= 75:
            return "🔥🔥 Hot"
        elif similarity_percentage >= 60:
            return "🔥 Warm"
        elif similarity_percentage >= 40:
            return "🌡️ Cool"
        elif similarity_percentage >= 20:
            return "❄️ Cold"
        else:
            return "🧊 Ice Cold"


# Global instance
embedding_service = EmbeddingService()
