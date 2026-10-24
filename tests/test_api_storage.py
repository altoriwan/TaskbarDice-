import unittest
from app.main import health_check, parse_tasks, get_latest
from app.schemas import ParseRequest
from app.storage import init_db, get_latest_batch

class TestAPIAndStorage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_health_endpoint(self):
        data = health_check()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["app"], "Deadline Heavyweight")

    def test_parse_and_persistence(self):
        payload = ParseRequest(
            raw_text="- Fix payment crash ASAP (2h)\n- Clean up styling tomorrow (1h)",
            use_llm=False
        )
        res = parse_tasks(payload)
        self.assertTrue(res.success)
        self.assertEqual(len(res.tasks), 2)
        self.assertGreater(res.summary.total_duration_hours, 2.0)

        # Verify persistent restore from get_latest()
        latest_res = get_latest()
        self.assertTrue(latest_res["has_data"])
        self.assertEqual(len(latest_res["tasks"]), 2)
        self.assertIn("Fix payment crash", latest_res["tasks"][0].title)

if __name__ == "__main__":
    unittest.main()
