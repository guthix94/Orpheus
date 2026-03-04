"""Tests for audio clip boundary snapping.

Verifies that LLM segment boundaries get shifted to natural pauses
detected by VAD, so clips don't cut mid-speech.
"""

from processing.stages.clips import (
    _find_pause_points,
    _nearest_pause_point,
    _snap_llm_boundaries,
    _groups_from_llm_segments,
)


# ---------------------------------------------------------------------------
# _find_pause_points
# ---------------------------------------------------------------------------


class TestFindPausePoints:
    def test_empty_vad(self):
        assert _find_pause_points([]) == []

    def test_silence_segments_extracted(self):
        vad = [
            {"start": 0.0, "end": 10.0, "type": "speech"},
            {"start": 10.0, "end": 12.0, "type": "silence"},
            {"start": 12.0, "end": 20.0, "type": "speech"},
        ]
        pauses = _find_pause_points(vad)
        assert len(pauses) == 1
        assert pauses[0] == (10.0, 12.0)

    def test_implicit_gaps_extracted(self):
        """Gaps between VAD segments (not covered by any segment) are pauses."""
        vad = [
            {"start": 0.0, "end": 10.0, "type": "speech"},
            # 1-second implicit gap
            {"start": 11.0, "end": 20.0, "type": "speech"},
        ]
        pauses = _find_pause_points(vad)
        assert len(pauses) == 1
        assert pauses[0] == (10.0, 11.0)

    def test_short_gaps_filtered(self):
        """Gaps shorter than _MIN_PAUSE_FOR_SNAP_S are excluded."""
        vad = [
            {"start": 0.0, "end": 10.0, "type": "speech"},
            # 0.05s gap — too short
            {"start": 10.05, "end": 20.0, "type": "speech"},
        ]
        pauses = _find_pause_points(vad)
        assert len(pauses) == 0

    def test_multiple_pauses_sorted(self):
        vad = [
            {"start": 0.0, "end": 5.0, "type": "speech"},
            {"start": 5.0, "end": 6.0, "type": "silence"},
            {"start": 6.0, "end": 15.0, "type": "music"},
            {"start": 15.0, "end": 16.5, "type": "silence"},
            {"start": 16.5, "end": 25.0, "type": "speech"},
        ]
        pauses = _find_pause_points(vad)
        assert len(pauses) == 2
        assert pauses[0][0] < pauses[1][0]


# ---------------------------------------------------------------------------
# _nearest_pause_point
# ---------------------------------------------------------------------------


class TestNearestPausePoint:
    def test_snaps_to_closest_pause(self):
        pauses = [(9.0, 11.0), (20.0, 22.0)]
        # Boundary at 10.5 — midpoint of (9,11)=10.0 is 0.5 away,
        # midpoint of (20,22)=21.0 is 10.5 away
        result = _nearest_pause_point(10.5, pauses)
        assert result == 10.0  # midpoint of first pause

    def test_no_pause_within_window(self):
        pauses = [(100.0, 102.0)]
        # Boundary at 10.0 — pause is 91s away, well outside window
        result = _nearest_pause_point(10.0, pauses)
        assert result == 10.0  # unchanged

    def test_empty_pauses(self):
        result = _nearest_pause_point(10.0, [])
        assert result == 10.0

    def test_multiple_pauses_picks_closest(self):
        pauses = [(8.0, 9.0), (10.5, 11.5), (14.0, 15.0)]
        # Boundary at 10.0 — midpoints are 8.5, 11.0, 14.5
        # Distances: 1.5, 1.0, 4.5 → picks 11.0
        result = _nearest_pause_point(10.0, pauses)
        assert result == 11.0


# ---------------------------------------------------------------------------
# _snap_llm_boundaries
# ---------------------------------------------------------------------------


class TestSnapLlmBoundaries:
    def test_single_segment_unchanged(self):
        """A single LLM segment has no internal boundaries to snap."""
        llm = [{"start_seconds": 0.0, "end_seconds": 300.0, "label": "Warm-up"}]
        vad = [
            {"start": 0.0, "end": 100.0, "type": "speech"},
            {"start": 100.0, "end": 102.0, "type": "silence"},
            {"start": 102.0, "end": 300.0, "type": "speech"},
        ]
        result = _snap_llm_boundaries(llm, vad)
        assert result[0]["start_seconds"] == 0.0
        assert result[0]["end_seconds"] == 300.0

    def test_boundary_snaps_to_silence(self):
        """Internal boundary should shift to the nearby silence gap."""
        llm = [
            {"start_seconds": 0.0, "end_seconds": 100.0, "label": "Scales"},
            {"start_seconds": 100.0, "end_seconds": 200.0, "label": "Vivaldi"},
        ]
        # Silence at 97-99s — LLM boundary at 100 should snap to 98.0
        vad = [
            {"start": 0.0, "end": 97.0, "type": "speech"},
            {"start": 97.0, "end": 99.0, "type": "silence"},
            {"start": 99.0, "end": 200.0, "type": "speech"},
        ]
        result = _snap_llm_boundaries(llm, vad)
        assert result[0]["end_seconds"] == 98.0  # midpoint of 97-99
        assert result[1]["start_seconds"] == 98.0

    def test_first_start_and_last_end_unchanged(self):
        """Only internal boundaries are adjusted."""
        llm = [
            {"start_seconds": 5.0, "end_seconds": 100.0, "label": "Part 1"},
            {"start_seconds": 100.0, "end_seconds": 200.0, "label": "Part 2"},
        ]
        vad = [
            {"start": 0.0, "end": 98.0, "type": "speech"},
            {"start": 98.0, "end": 100.0, "type": "silence"},
            {"start": 100.0, "end": 200.0, "type": "speech"},
        ]
        result = _snap_llm_boundaries(llm, vad)
        # First start and last end are NOT touched
        assert result[0]["start_seconds"] == 5.0
        assert result[1]["end_seconds"] == 200.0

    def test_no_nearby_pause_keeps_original(self):
        """If no silence exists near the boundary, it stays put."""
        llm = [
            {"start_seconds": 0.0, "end_seconds": 100.0, "label": "Part 1"},
            {"start_seconds": 100.0, "end_seconds": 200.0, "label": "Part 2"},
        ]
        # No silence anywhere near 100s
        vad = [
            {"start": 0.0, "end": 50.0, "type": "speech"},
            {"start": 50.0, "end": 51.0, "type": "silence"},
            {"start": 51.0, "end": 200.0, "type": "speech"},
        ]
        result = _snap_llm_boundaries(llm, vad)
        # 50.5 (midpoint of 50-51) is 49.5s from 100 — outside 5s window
        assert result[0]["end_seconds"] == 100.0
        assert result[1]["start_seconds"] == 100.0

    def test_snap_skipped_if_segment_too_short(self):
        """Don't snap if it would make a segment shorter than minimum."""
        llm = [
            {"start_seconds": 0.0, "end_seconds": 1.0, "label": "Tiny"},
            {"start_seconds": 1.0, "end_seconds": 200.0, "label": "Big"},
        ]
        # Silence at 0.1-0.3s — snapping to 0.2 would make segment 0 only 0.2s
        vad = [
            {"start": 0.0, "end": 0.1, "type": "speech"},
            {"start": 0.1, "end": 0.3, "type": "silence"},
            {"start": 0.3, "end": 200.0, "type": "speech"},
        ]
        result = _snap_llm_boundaries(llm, vad)
        assert result[0]["end_seconds"] == 1.0  # unchanged

    def test_empty_vad_returns_original(self):
        llm = [
            {"start_seconds": 0.0, "end_seconds": 100.0, "label": "A"},
            {"start_seconds": 100.0, "end_seconds": 200.0, "label": "B"},
        ]
        result = _snap_llm_boundaries(llm, [])
        assert result[0]["end_seconds"] == 100.0

    def test_multiple_boundaries_snapped(self):
        """Each internal boundary is independently snapped."""
        llm = [
            {"start_seconds": 0.0, "end_seconds": 100.0, "label": "Scales"},
            {"start_seconds": 100.0, "end_seconds": 200.0, "label": "Vivaldi"},
            {"start_seconds": 200.0, "end_seconds": 300.0, "label": "Sight-reading"},
        ]
        vad = [
            {"start": 0.0, "end": 98.0, "type": "speech"},
            {"start": 98.0, "end": 100.5, "type": "silence"},
            {"start": 100.5, "end": 198.0, "type": "speech"},
            {"start": 198.0, "end": 199.0, "type": "silence"},
            {"start": 199.0, "end": 300.0, "type": "speech"},
        ]
        result = _snap_llm_boundaries(llm, vad)
        # First boundary: 100 → midpoint of (98, 100.5) = 99.25
        assert result[0]["end_seconds"] == 99.25
        assert result[1]["start_seconds"] == 99.25
        # Second boundary: 200 → midpoint of (198, 199) = 198.5
        assert result[1]["end_seconds"] == 198.5
        assert result[2]["start_seconds"] == 198.5

    def test_does_not_mutate_input(self):
        """Input list should not be modified."""
        llm = [
            {"start_seconds": 0.0, "end_seconds": 100.0, "label": "A"},
            {"start_seconds": 100.0, "end_seconds": 200.0, "label": "B"},
        ]
        vad = [
            {"start": 0.0, "end": 99.0, "type": "speech"},
            {"start": 99.0, "end": 101.0, "type": "silence"},
            {"start": 101.0, "end": 200.0, "type": "speech"},
        ]
        _snap_llm_boundaries(llm, vad)
        assert llm[0]["end_seconds"] == 100.0  # original unchanged


# ---------------------------------------------------------------------------
# Integration: snapped boundaries flow through to clip groups
# ---------------------------------------------------------------------------


class TestSnappedGroupsIntegration:
    def test_clip_groups_use_snapped_boundaries(self):
        """Verify the full flow: snap → groups produces correct start/end."""
        llm = [
            {"start_seconds": 0.0, "end_seconds": 60.0, "label": "Warm-up"},
            {"start_seconds": 60.0, "end_seconds": 120.0, "label": "Etude"},
        ]
        vad = [
            {"start": 0.0, "end": 58.0, "type": "speech"},
            {"start": 58.0, "end": 62.0, "type": "silence"},
            {"start": 62.0, "end": 120.0, "type": "speech"},
        ]
        snapped = _snap_llm_boundaries(llm, vad)
        groups = _groups_from_llm_segments(snapped)

        assert len(groups) == 2
        assert groups[0].start == 0.0
        assert groups[0].end == 60.0  # midpoint of (58, 62)
        assert groups[1].start == 60.0
        assert groups[1].end == 120.0
