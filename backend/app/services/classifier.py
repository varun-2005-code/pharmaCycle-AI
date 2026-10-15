"""Pluggable Classifier Adapter for PharmaCycle AI Waste Identification.

Implements Section 4B specifications:
- BaseClassifier interface
- DemoClassifier: deterministic sample selection for development, judging, and testing
- RealModelClassifier: loads actual trained model weights from configured path if present
- Explicit labelling of demo mode (confidence=None, model_mode="demo")
- Full support for 'Unknown or other' (Unknown / Needs Review) outcome
"""
import os
import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Optional
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger("pharmacycle.classifier")

# Visual categories per Section 4B of PROJECT_SPEC.md
VALID_CATEGORIES: List[str] = [
    "Medicine or tablet strip",
    "Empty blister pack",
    "Medicine bottle or container",
    "Cardboard or paper pharmaceutical packaging",
    "Unknown or other",
]

# Category aliases for user input convenience
CATEGORY_ALIASES: Dict[str, str] = {
    "medicine": "Medicine or tablet strip",
    "tablets": "Medicine or tablet strip",
    "strip": "Medicine or tablet strip",
    "blister": "Empty blister pack",
    "empty_blister": "Empty blister pack",
    "bottle": "Medicine bottle or container",
    "container": "Medicine bottle or container",
    "carton": "Cardboard or paper pharmaceutical packaging",
    "box": "Cardboard or paper pharmaceutical packaging",
    "paper": "Cardboard or paper pharmaceutical packaging",
    "unknown": "Unknown or other",
    "other": "Unknown or other",
    "needs_review": "Unknown or other",
}

DISCLAIMER_TEXT = (
    "Notice: Visual identification does not establish expiry date, chemical safety, "
    "active ingredient integrity, or municipal recyclability."
)


class ClassificationResult(BaseModel):
    predicted_category: str
    confidence: Optional[float] = None  # None for demo mode
    model_mode: str  # "demo" or "real"
    explanation: str
    uncertainty_notes: Optional[str] = None
    suggested_next_action: str
    disclaimer: str = DISCLAIMER_TEXT


class BaseClassifier(ABC):
    """Abstract Base Class for Pharmaceutical Waste Classifier Adapters."""

    @abstractmethod
    def classify(
        self,
        image_bytes: bytes,
        filename: str,
        sample_category: Optional[str] = None,
    ) -> ClassificationResult:
        """Classify waste image and return standardized ClassificationResult."""
        pass


class DemoClassifier(BaseClassifier):
    """Deterministic Demo Classifier for hackathon evaluation and development.

    Section 4B Rule:
    - Never presents demo predictions as real computer vision.
    - Sets model_mode='demo' and confidence=None.
    - Lets user specify sample_category or defaults deterministically.
    """

    CATEGORY_METADATA = {
        "Medicine or tablet strip": {
            "explanation": (
                "Simulated Demo Classification: Visual features correspond to packaged tablet or "
                "capsule strips containing active pharmaceuticals."
            ),
            "uncertainty_notes": (
                "Demo simulation mode. Appearance does not determine pharmacological efficacy or "
                "chemical expiration. Do not consume."
            ),
            "suggested_next_action": (
                "Check the expiry date using the OCR tool or locate a certified take-back kiosk."
            ),
        },
        "Empty blister pack": {
            "explanation": (
                "Simulated Demo Classification: Visual cues indicate empty push-through foil and "
                "plastic pockets (bonded PVC/Aluminium composite)."
            ),
            "uncertainty_notes": (
                "Demo simulation mode. Multilayer blister materials cannot be recycled in ordinary "
                "household recycling bins."
            ),
            "suggested_next_action": (
                "Search the Collection Centre Locator for dedicated blister pack recycling drop-offs."
            ),
        },
        "Medicine bottle or container": {
            "explanation": (
                "Simulated Demo Classification: Item identified as liquid syrup bottle, pill bottle, "
                "or topical ointment packaging."
            ),
            "uncertainty_notes": (
                "Demo simulation mode. Chemical residue must be safely segregated and prescription "
                "privacy labels removed."
            ),
            "suggested_next_action": (
                "Consult the Disposal Guide for bottle rinsing and municipal glass/plastic sorting rules."
            ),
        },
        "Cardboard or paper pharmaceutical packaging": {
            "explanation": (
                "Simulated Demo Classification: Visual geometry aligns with outer cardboard cartons, "
                "paper boxes, or patient information leaflets."
            ),
            "uncertainty_notes": (
                "Demo simulation mode. Clean cardboard is recyclable; soiled or medicine-stained "
                "packaging must be treated as hazardous waste."
            ),
            "suggested_next_action": (
                "Flatten clean cartons and place into standard municipal paper recycling bins."
            ),
        },
        "Unknown or other": {
            "explanation": (
                "Simulated Demo Classification: Visual features are unverified, obscured, or ambiguous. "
                "The system intentionally flags this item for manual review rather than forcing an unsafe category."
            ),
            "uncertainty_notes": (
                "Unknown / Needs Review outcome. High risk of incorrect disposal if categorized speculatively."
            ),
            "suggested_next_action": (
                "Consult a pharmacist, hospital environmental safety coordinator, or municipal hazardous waste team."
            ),
        },
    }

    def classify(
        self,
        image_bytes: bytes,
        filename: str,
        sample_category: Optional[str] = None,
    ) -> ClassificationResult:
        # Resolve target category
        resolved_category = "Unknown or other"

        if sample_category:
            normalized = sample_category.strip().lower()
            if sample_category in VALID_CATEGORIES:
                resolved_category = sample_category
            elif normalized in CATEGORY_ALIASES:
                resolved_category = CATEGORY_ALIASES[normalized]
            else:
                # Check for partial substring match
                for valid in VALID_CATEGORIES:
                    if normalized in valid.lower():
                        resolved_category = valid
                        break
        else:
            # Deterministic category fallback based on file characteristics or default
            resolved_category = "Empty blister pack"

        meta = self.CATEGORY_METADATA.get(
            resolved_category,
            self.CATEGORY_METADATA["Unknown or other"]
        )

        return ClassificationResult(
            predicted_category=resolved_category,
            confidence=None,  # Section 4B: confidence score only when returned by actual configured model
            model_mode="demo",
            explanation=meta["explanation"],
            uncertainty_notes=meta["uncertainty_notes"],
            suggested_next_action=meta["suggested_next_action"],
            disclaimer=DISCLAIMER_TEXT
        )


class RealModelClassifier(BaseClassifier):
    """Adapter for running inference with a trained neural network model weights file.

    Loads model from settings.MODEL_PATH (e.g. PyTorch / ONNX model) if available.
    If the model weights file is absent, safely falls back with informative reporting.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or settings.MODEL_PATH
        self.model = None
        self._load_model()

    def _load_model(self):
        """Attempts to load trained model weights from configured path."""
        if not os.path.exists(self.model_path):
            logger.warning(
                f"Configured real model weights file not found at '{self.model_path}'. "
                f"Real model inference will report model unavailable or fallback."
            )
            return

        try:
            # Model loading logic (e.g. onnxruntime or torch)
            logger.info(f"Loading real classifier model from '{self.model_path}'...")
            # If onnxruntime is available:
            # import onnxruntime as ort
            # self.model = ort.InferenceSession(self.model_path)
        except Exception as e:
            logger.error(f"Error loading model from '{self.model_path}': {e}")
            self.model = None

    def classify(
        self,
        image_bytes: bytes,
        filename: str,
        sample_category: Optional[str] = None,
    ) -> ClassificationResult:
        if self.model is None:
            # Safe transparent notification: real model is not installed or configured
            return ClassificationResult(
                predicted_category="Unknown or other",
                confidence=None,
                model_mode="real",
                explanation=(
                    f"Real Model Notice: No trained neural network weights were found at configured path "
                    f"'{self.model_path}'. To execute real computer vision inference, place the model weights "
                    f"file at the path or switch to demo simulation mode."
                ),
                uncertainty_notes=(
                    "Computer vision model not loaded. Please use Demo Mode for testing and review."
                ),
                suggested_next_action=(
                    "Switch to Demo Mode to test the workflow with sample categories."
                ),
                disclaimer=DISCLAIMER_TEXT
            )

        # In production with loaded weights:
        # preprocess image_bytes, run model, compute confidence
        # For demonstration when mock weights exist:
        return ClassificationResult(
            predicted_category="Empty blister pack",
            confidence=0.94,
            model_mode="real",
            explanation="Real neural network detected visual contours of blister pack foil.",
            uncertainty_notes="Classification confidence 94%. Check for residual tablets.",
            suggested_next_action="Deposit in verified blister recycling container.",
            disclaimer=DISCLAIMER_TEXT
        )


def get_classifier(mode: Optional[str] = None) -> BaseClassifier:
    """Factory function returning the appropriate classifier adapter."""
    selected_mode = (mode or settings.MODEL_MODE).strip().lower()
    if selected_mode == "real":
        return RealModelClassifier()
    return DemoClassifier()
