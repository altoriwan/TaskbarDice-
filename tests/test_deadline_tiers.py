import unittest
from app.parser import parse_raw_text, extract_duration, extract_deadline_and_hours_remaining, calculate_composite_weight

class TestDeadlineTiers(unittest.TestCase):
    """
    Unit tests for regex parsing across Light, Moderate, and Extreme deadline strings.
    Validates:
    1. Task Name extraction
    2. Deadline Proximity (hours remaining & label)
    3. Estimated Workload Duration
    4. Composite Urgency/Weight Score (1-100) and Stress Tier
    """

    def test_light_deadline_strings(self):
        """Tests parsing of low-urgency, flexible, and light workload tasks."""
        raw_text = """
        - Đọc tài liệu cập nhật Three.js tuần tới (1h)
        - Review documentation for client next week (30 mins)
        - Gửi email tổng kết sprint thong thả (45 phút)
        """
        tasks, summary = parse_raw_text(raw_text)
        self.assertEqual(len(tasks), 3, "Should extract exactly 3 light tasks")

        for task in tasks:
            # 1. Task Name
            self.assertTrue(len(task.title) > 5, f"Task title '{task.title}' should be clean and non-empty")
            # 2. Deadline proximity should be flexible/extended
            self.assertGreaterEqual(task.hours_remaining, 24.0, f"Light task '{task.title}' should have extended deadline")
            # 3. Workload Duration
            self.assertLessEqual(task.estimated_duration, 2.0, f"Light task '{task.title}' should have short duration")
            # 4. Urgency Score (1-100) & Stress Level
            self.assertLessEqual(task.weight_score, 45, f"Light task '{task.title}' weight ({task.weight_score}) should be <= 45")
            self.assertIn(task.stress_level, ["calm", "elevated"])

        self.assertEqual(summary.overall_stress_state, "calm")

    def test_moderate_deadline_strings(self):
        """Tests parsing of medium-urgency tasks with moderate duration and tomorrow deadlines."""
        raw_text = """
        1. Cập nhật banner landing page sang giao diện Tết tối mai (3h)
        2. Viết tài liệu API endpoint cho đối tác ngày mai (4 tiếng)
        3. Test hồi quy luồng đăng ký tài khoản mới in 2 days (2.5h)
        """
        tasks, summary = parse_raw_text(raw_text)
        self.assertEqual(len(tasks), 3, "Should extract exactly 3 moderate tasks")

        for task in tasks:
            # 1. Task Name
            self.assertTrue(len(task.title) > 5)
            # 2. Deadline Proximity
            self.assertTrue(
                "tomorrow" in task.deadline_str.lower() or "ngày mai" in task.deadline_str.lower() or "days" in task.deadline_str.lower(),
                f"Deadline '{task.deadline_str}' should reflect moderate proximity"
            )
            # 3. Workload Duration
            self.assertGreaterEqual(task.estimated_duration, 2.0)
            self.assertLessEqual(task.estimated_duration, 5.0)
            # 4. Urgency Score (1-100) & Stress Level
            self.assertTrue(
                36 <= task.weight_score <= 80,
                f"Moderate task '{task.title}' weight ({task.weight_score}) should be in moderate range"
            )

        self.assertIn(summary.overall_stress_state, ["elevated", "calm"])

    def test_extreme_deadline_strings(self):
        """Tests parsing of high-urgency, imminent deadline tasks (ASAP, today, critical)."""
        raw_text = """
        [P0 KHẨN CẤP] Hotfix lỗi memory leak sập server production trước 15h chiều nay (mất 3h)
        - Khẩn: Sửa lỗi thanh toán Momo đang bị treo đơn ASAP (2h)
        - Cháy deadline nộp báo cáo tài chính Q4 cho ban giám đốc trước 17h hôm nay (mất 4 tiếng)
        """
        tasks, summary = parse_raw_text(raw_text)
        self.assertEqual(len(tasks), 3, "Should extract exactly 3 extreme tasks")

        for task in tasks:
            # 1. Task Name
            self.assertTrue(len(task.title) > 5)
            # 2. Imminent Deadline proximity (hours_remaining <= 6h)
            self.assertLessEqual(task.hours_remaining, 6.0, f"Task '{task.title}' hours_remaining ({task.hours_remaining}) should be <= 6.0")
            # 3. Workload Duration
            self.assertGreaterEqual(task.estimated_duration, 2.0)
            # 4. Urgency Score (1-100) & Stress Level
            self.assertGreaterEqual(task.weight_score, 71, f"Task '{task.title}' weight ({task.weight_score}) should be >= 71 for extreme tier")
            self.assertEqual(task.stress_level, "critical", f"Task '{task.title}' should have 'critical' stress level")

        # Summary overall state
        self.assertEqual(summary.overall_stress_state, "critical")
        self.assertEqual(summary.critical_count, 3)
        self.assertGreaterEqual(summary.average_weight, 75.0)

if __name__ == "__main__":
    unittest.main()
