"""
canonical/classes.py — TRUST-CV Canonical Class Registry

Maps source-format class IDs to canonical class IDs.
COCO category_id != canonical class_id.
Never auto-merges classes with similar names.
"""
from __future__ import annotations
from typing import Dict, List, Optional, Any


class CanonicalClassRegistry:
    """
    Maintains explicit bidirectional mapping between source format
    class identifiers and canonical 0-indexed class IDs.
    """

    def __init__(self):
        # canonical_id → name
        self._id_to_name: Dict[int, str] = {}
        # (source_format, source_id) → canonical_id
        self._source_to_canonical: Dict[tuple, int] = {}
        # canonical_id → list of source_mappings
        self._source_mappings: Dict[int, List[Dict[str, Any]]] = {}

    # ── Build the registry ────────────────────────────────────

    def register_from_names(
        self,
        names: List[str],
        source_format: str,
        source_ids: Optional[List[int]] = None
    ) -> None:
        """
        Register classes from an ordered name list.
        source_ids: if None, source_id == canonical_id (0,1,2,...)
        """
        for canonical_id, name in enumerate(names):
            src_id = source_ids[canonical_id] if source_ids else canonical_id
            self._register_one(canonical_id, name, source_format, src_id)

    def register_from_map(
        self,
        id_to_name: Dict[int, str],
        source_format: str,
        source_id_map: Optional[Dict[int, int]] = None
    ) -> None:
        """
        Register from a dict {canonical_id: name}.
        source_id_map: {canonical_id: source_id} — if None, assumes same.
        """
        for canonical_id, name in sorted(id_to_name.items()):
            src_id = source_id_map.get(canonical_id, canonical_id) if source_id_map else canonical_id
            self._register_one(canonical_id, name, source_format, src_id)

    def register_coco_categories(self, categories: List[Dict[str, Any]]) -> None:
        """
        Register COCO categories.
        Assigns sequential canonical IDs (0, 1, 2, ...).
        Preserves original COCO category_id in source_metadata.

        IMPORTANT: COCO category_id is NOT the canonical class_id.
        """
        for canonical_id, cat in enumerate(sorted(categories, key=lambda c: c["id"])):
            src_id = cat["id"]
            name = cat.get("name", f"category_{src_id}")
            self._register_one(canonical_id, name, "COCO", src_id)

    def _register_one(self, canonical_id: int, name: str,
                      source_format: str, source_id: int) -> None:
        self._id_to_name[canonical_id] = name
        self._source_to_canonical[(source_format, source_id)] = canonical_id
        if canonical_id not in self._source_mappings:
            self._source_mappings[canonical_id] = []
        self._source_mappings[canonical_id].append({
            "format": source_format,
            "source_id": source_id,
        })

    # ── Lookups ───────────────────────────────────────────────

    def canonical_id(self, source_format: str, source_id: int) -> Optional[int]:
        """Return canonical_id for a source (format, source_id) pair, or None."""
        return self._source_to_canonical.get((source_format, source_id))

    def name(self, canonical_id: int) -> Optional[str]:
        return self._id_to_name.get(canonical_id)

    def is_known_source_id(self, source_format: str, source_id: int) -> bool:
        return (source_format, source_id) in self._source_to_canonical

    @property
    def id_to_name(self) -> Dict[int, str]:
        return dict(self._id_to_name)

    @property
    def num_classes(self) -> int:
        return len(self._id_to_name)

    def to_dict(self) -> List[Dict[str, Any]]:
        return [
            {
                "class_id": cid,
                "name": self._id_to_name[cid],
                "source_mappings": self._source_mappings.get(cid, []),
            }
            for cid in sorted(self._id_to_name.keys())
        ]
