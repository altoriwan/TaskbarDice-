import unittest
import math
from app.parser import parse_raw_text, extract_duration, calculate_composite_weight
from app.storage import init_db, save_batch, get_latest_batch
from app.main import parse_tasks
from app.schemas import ParseRequest

class TestBoundaryAndDefensiveAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_edge_case_1_extreme_unbounded_numbers(self):
        """Case 1: Excessive duration/day numbers must not produce inf, NaN, or overflow."""
        raw = "Làm dự án nghiên cứu AI (9999999999999999999999999 ngày)\nViết tài liệu 100000000000000h"
        tasks, summary = parse_raw_text(raw)
        self.assertEqual(len(tasks), 2)
        
        for t in tasks:
            self.assertFalse(math.isinf(t.estimated_duration))
            self.assertFalse(math.isnan(t.estimated_duration))
            self.assertFalse(math.isnan(t.weight_score))
            self.assertGreaterEqual(t.weight_score, 1)
            self.assertLessEqual(t.weight_score, 100)
            # Duration should be defensively clamped (e.g. max 168 hours = 1 week or similar safe bound)
            self.assertLessEqual(t.estimated_duration, 168.0)

    def test_edge_case_2_null_bytes_and_injection(self):
        """Case 2: Null bytes, HTML tags, and unicode emojis must not break parser or SQLite."""
        raw = "🔥 Fix critical leak <script>alert('pwn')</script>\x00 with extra null\n- Check task 🚀 1h"
        # Should parse and save to SQLite without ValueError: embedded null byte
        req = ParseRequest(raw_text=raw, use_llm=False)
        res = parse_tasks(req)
        self.assertTrue(res.success)
        self.assertGreaterEqual(len(res.tasks), 1)
        self.assertNotIn("\x00", res.tasks[0].title)

    def test_edge_case_3_missing_timestamps(self):
        """Case 3: Pure conversational tasks without any time markers or numbers."""
        raw = """
        - Cần làm lại giao diện cho đẹp hơn
        - Tối ưu hiệu năng thuật toán tìm kiếm
        - Chuẩn bị slide thuyết trình nội bộ
        """
        tasks, summary = parse_raw_text(raw)
        self.assertEqual(len(tasks), 3)
        for t in tasks:
            self.assertGreater(t.estimated_duration, 0)
            self.assertGreater(t.hours_remaining, 0)
            self.assertIn(t.stress_level, ["calm", "elevated", "critical"])
            self.assertIsInstance(t.weight_score, int)

    def test_edge_case_4_massive_unstructured_input(self):
        """Case 4: Massive text block with 500 lines and weird indentations."""
        lines = [f"  *  [ ] Task number {i} - 2h deadline chiều mai \t" for i in range(250)]
        raw = "\n".join(lines)
        tasks, summary = parse_raw_text(raw)
        self.assertEqual(len(tasks), 250)
        self.assertGreater(summary.total_duration_hours, 0)
        self.assertFalse(math.isnan(summary.average_weight))

    def test_edge_case_5_zero_and_negative_values(self):
        """Case 5: Zero and negative numbers must not cause division by zero or negative weights."""
        raw = """
        - Fix bug trong 0 phút
        - Task âm thời gian -5h
        - Hạn chót trước 0h (0 ngày nữa)
        """
        tasks, summary = parse_raw_text(raw)
        self.assertEqual(len(tasks), 3)
        for t in tasks:
            self.assertGreater(t.estimated_duration, 0)
            self.assertGreater(t.hours_remaining, 0)
            self.assertGreaterEqual(t.weight_score, 1)
            self.assertLessEqual(t.weight_score, 100)

    def test_edge_case_6_analyze_deadline_endpoint(self):
        """Case 6: Validate analyze_deadline endpoint with raw text and single task parameters."""
        from main import analyze_deadline, DeadlineAnalyzeRequest
        from fastapi import HTTPException

        # Test Mode 1: raw_text
        req = DeadlineAnalyzeRequest(raw_text="Hotfix memory leak trong 2h gấp", use_llm=False)
        res = analyze_deadline(req)
        self.assertTrue(res.success)
        self.assertEqual(len(res.tasks), 1)
        task = res.tasks[0]
        self.assertEqual(task.weight_score, task.stress_score)
        self.assertIn(task.stress_level, ["calm", "elevated", "critical"])
        self.assertGreater(task.estimated_duration, 0)
        self.assertIsNotNone(task.deadline_str)

        # Test Mode 2: single task
        req2 = DeadlineAnalyzeRequest(title="Emergency production fix", deadline_hours=2.0, urgency="critical")
        res2 = analyze_deadline(req2)
        self.assertTrue(res2.success)
        self.assertEqual(len(res2.tasks), 1)
        self.assertEqual(res2.tasks[0].material, "tungsten")

        # Test Mode 3: empty input must raise 400
        req3 = DeadlineAnalyzeRequest()
        with self.assertRaises(HTTPException) as ctx:
            analyze_deadline(req3)
        self.assertEqual(ctx.exception.status_code, 400)

if __name__ == "__main__":
    unittest.main()
