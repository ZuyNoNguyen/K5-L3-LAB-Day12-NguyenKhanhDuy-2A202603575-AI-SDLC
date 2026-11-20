# AGENTS.md — Đảo Đèn Lồng (AI SDLC Harness)

## 1. Kiến trúc & Nguyên tắc cốt lõi
- **Tách biệt hoàn toàn Core Logic & 3D Client:**
  - `src/core/sim.mjs`: Toàn bộ logic simulation 60 ticks/s, PRNG tất định (`mulberry32`), vật lý XZ, va chạm, điểm số. **CẤM** import DOM, WebGL, `Math.random()`, hay `Date.now()` trong `src/core/`.
  - `src/headless.mjs`: CLI chạy `src/core/sim.mjs` theo đúng `game.contract.json` (Test Contract).
  - `src/client/`: Giao diện 3D góc nhìn thứ ba (Zero-dependency 3D Perspective Canvas Engine) và tính năng sáng tạo thêm. Các thực thể/hiệu ứng sáng tạo chỉ chạy ở client hoặc tắt khi headless để **không bao giờ làm thay đổi đầu ra headless**.

## 2. Lệnh Build, Chạy & Kiểm chứng
- Cài đặt / Build: `npm test` (Zero-dependency core, chạy trực tiếp trên Node.js >= 18 ở Windows/macOS/Linux).
- Mở game 3D: `npm start` (Mở server tĩnh tại `http://localhost:3000`).
- Chạy Headless: `node src/headless.mjs --seed 1 --night 1 --ticks 600 --out out.jsonl`
- Chạy toàn bộ Test & Sinh bằng chứng: `npm run verify`

## 3. Quy tắc Bắt buộc (Test Contract v1.0)
- **Mô hình Tick:** 60 ticks/s (`dt = 1/60`). Tick 0 là snapshot sau khi dựng `scenario`, trước khi áp dụng input. Bước `k` (`0..N-1`) đọc input tick `k`, tạo trạng thái `k+1`, ghi event với `tick: k+1`.
- **Khoảng cách:** Tính trên mặt phẳng ngang **XZ** (`Math.hypot(dx, dz) <= r`), không cộng kích thước nhân vật.
- **Di chuyển:** `θ = cam_yaw_deg * Math.PI / 180`. Chuẩn hóa `[x, z]` nếu độ dài `> 1`. `x' = x*cosθ + z*sinθ`, `z' = -x*sinθ + z*cosθ`.
- **Nút hành động (`interact`, `pulse`, `jump`):** Chỉ kích hoạt ở sườn lên (`false -> true`).
- **Tất định (Determinism):** Cùng `--seed`, `--scenario`, `--inputs` phải cho ra file `.jsonl` giống hệt nhau 100% từng byte.
- **Mã thoát (Exit code):** Thành công = `0`; Lỗi định dạng/quy ước `inputs` hoặc `scenario` = `2` (ghi `stderr`); Lỗi khác = `1`.

## 4. Quy trình làm việc cho Agent
1. Đọc kỹ yêu cầu Phase và cập nhật giả định vào `docs/notes/phaseN-spec.md` trước khi sửa code.
2. Không xóa/tắt test cũ âm thầm. Nếu yêu cầu mới thay đổi luật cũ, cập nhật test và ghi rõ lý do.
3. Chạy `npm run verify` xanh 100% và kiểm tra bằng chứng trong `docs/proof/` trước khi commit.
