# TaskbarDice — Báo cáo tiếp quản và sửa hover

Ngày kiểm tra: 25/10/2026

## Trạng thái source

- Bản đang chạy trong gói này là Python + pywebview + Canvas 2D, với `app.py`, `dice_logic.py` và `static/index.html` làm luồng ứng dụng chính.
- Chưa có solution/project C# WPF (`.sln`, `.csproj`, `.cs`, `.xaml`) trong ZIP nguồn; việc chuyển sang WPF vẫn là bước tương lai, chưa được build/verify.
- Gói nguồn còn chứa prototype cũ Deadline Heavyweight (FastAPI/SQLite) và bộ test phụ. Các thành phần cũ này không phải entry point của TaskbarDice hiện tại.

## Thay đổi trong bản sửa

- `static/index.html`: loại bỏ hover rectangle `strokeRect()`; vẽ viền theo đa giác isometric 6 đỉnh (outer glow + outline màu warm white).
- Hit-test cho hover và double-click dùng cùng đa giác trong toạ độ màn hình của khung hình đã render, gồm cả offset/rotation/wobble/hover lift/screen shake.
- Khối đang hover nhấc lên nhẹ; vùng bóng chân được điều chỉnh.
- `tests/test_hover_polygon.js`: thêm kiểm thử cho silhouette 6 đỉnh, điểm trong/ngoài đa giác, transform và kiểm tra hover/double-click không dùng rectangle.
- Một số test hiện có được cập nhật để khớp với hit-test đa giác và để ghi nhận rõ các kiểm tra phụ thuộc scanner ngoài khi scanner không có trong gói.

## Xác minh đã chạy trong môi trường phân tích Linux

- Python: `python -m compileall -q app.py dice_logic.py app tests` — đạt.
- Pytest: 156 passed, 2 skipped; 22 subtests passed.
- Các file test JavaScript: chạy bằng Node.js, tất cả đều đạt; gồm `test_hover_polygon.js`, bộ rotation, tooltip và các test M2/M3.
- Hai lượt skip là kiểm tra AgentShield cần script scanner bên ngoài không có trong ZIP. Không được hiểu là đã qua quét bảo mật.
- Đã thử chạy Chromium headless để chụp giao diện nhưng môi trường thực thi chặn truy cập trang (`ERR_BLOCKED_BY_ADMINISTRATOR`). Vì thế chưa có xác minh ảnh render trong phiên này.
- Chưa chạy ứng dụng PyWebView hay build EXE trên Windows 11. Cần kiểm tra runtime/DPI/click-through trên máy Windows thực.

## Các vấn đề nên xử lý tiếp

1. Chạy thử và chụp ảnh trên Windows 11 để nghiệm thu outline hover trong giao diện thật.
2. Sửa phân loại lỗi lưu trữ trong `app.py`: lỗi ghi file không nên bị báo nhầm là `overload` hoặc `not_found`.
3. `requirements.txt` hiện chỉ khai báo pywebview; script build EXE dùng PyInstaller nhưng cần xác định/cố định dependency build để quy trình đóng gói tái lập được.
4. `.gitignore` hiện bỏ qua thư mục `tests/`; nếu muốn CI chạy bộ test này thì cần cập nhật quy tắc theo dõi test.
5. Dọn/tách prototype Deadline Heavyweight và các artefact cũ sau khi xác nhận không còn cần dùng.
6. Chỉ bắt đầu port sang C# WPF sau khi hành vi/ảnh chuẩn của bản Python được chốt, trừ khi có lý do kỹ thuật buộc phải chuyển sớm.

## Dữ liệu prototype cũ

Database `data/deadline_heavyweight.db` trong ZIP đầu vào thuộc prototype cũ và khiến test storage phụ thuộc vào dữ liệu đã tồn tại. Để tránh làm nhiễm các lần test mới, bản này giữ một bản sao nguyên gốc tại `legacy_runtime_data/deadline_heavyweight.db.original`; file không được sử dụng bởi luồng TaskbarDice hiện tại.
