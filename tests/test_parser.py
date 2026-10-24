import unittest
from app.parser import (
    parse_raw_text,
    extract_duration,
    extract_deadline_and_hours_remaining,
    calculate_composite_weight
)

class TestHeuristicParser(unittest.TestCase):
    def test_english_extraction(self):
        sample = """
        - Fix critical database memory leak ASAP (mất 3h)
        - Update landing page copy by tomorrow
        - Schedule weekly team sync (30 mins)
        """
        tasks, summary = parse_raw_text(sample)
        self.assertEqual(len(tasks), 3)
        
        # Task 1: ASAP critical
        t1 = tasks[0]
        self.assertIn("database memory leak", t1.title)
        self.assertGreaterEqual(t1.urgency_score, 9.0)
        self.assertEqual(t1.estimated_duration, 3.0)
        self.assertEqual(t1.stress_level, "critical")
        
        # Task 3: 30 mins meeting
        t3 = tasks[2]
        self.assertEqual(t3.estimated_duration, 0.5)
        self.assertEqual(t3.stress_level, "calm")

    def test_vietnamese_extraction(self):
        sample = """
        1. Gấp: Sửa lỗi thanh toán trước 17h chiều nay
        2. Tối mai nộp báo cáo quý (mất tầm 4 tiếng)
        3. Gửi email xác nhận khách hàng
        """
        tasks, summary = parse_raw_text(sample)
        self.assertEqual(len(tasks), 3)
        
        # Task 1: Gấp, chiều nay
        t1 = tasks[0]
        self.assertIn("Sửa lỗi thanh toán", t1.title)
        self.assertGreaterEqual(t1.urgency_score, 8.0)
        self.assertEqual(t1.stress_level, "critical")
        
        # Task 2: 4 tiếng, tối mai
        t2 = tasks[1]
        self.assertEqual(t2.estimated_duration, 4.0)
        self.assertEqual(t2.deadline_str, "Tomorrow / Ngày mai")
        
        # Summary checks
        self.assertEqual(summary.total_tasks, 3)
        self.assertGreater(summary.total_duration_hours, 5.0)

    def test_duration_parsing(self):
        self.assertEqual(extract_duration("Refactor auth module (2 ngày)"), 16.0)
        self.assertEqual(extract_duration("Debug API latency - 4h"), 4.0)
        self.assertEqual(extract_duration("Review PR - 45 phút"), 0.75)

    def test_stress_tiers(self):
        # High urgency + high duration = critical
        weight_crit, level_crit = calculate_composite_weight(
            duration=8.0, hours_left=4.0, urgency=9.8, difficulty=8.5
        )
        self.assertGreaterEqual(weight_crit, 71)
        self.assertEqual(level_crit, "critical")

        # Low urgency + low duration = calm
        weight_calm, level_calm = calculate_composite_weight(
            duration=0.5, hours_left=72.0, urgency=3.0, difficulty=2.5
        )
        self.assertLessEqual(weight_calm, 35)
        self.assertEqual(level_calm, "calm")

if __name__ == "__main__":
    unittest.main()
