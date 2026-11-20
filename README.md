# 🏮 Đảo Đèn Lồng (Lantern Island) — Day 12 AI SDLC Lab

> **Video Demo (Sẽ đính kèm tại Release `v1.0.0` ở Phase 4):** [Xem Video Demo](./docs/demo/demo.mp4)
> **Sinh viên thực hiện:** Nguyễn Khánh Duy · **MSSV:** `2A202603575`
> **Trạng thái hiện tại:** Hoàn thành **Phase 1 (PRD-0 & Test Contract v1.0)**

---

## 1. Giới thiệu Game

**Đảo Đèn Lồng** là game 3D góc nhìn thứ ba mang phong cách cổ tích đêm ấm áp. Bạn điều khiển **Mây** (người giữ đèn nhỏ tuổi đội nón lá có treo chiếc đèn lồng nhỏ) chạy khắp **Đảo Bến (Đêm 1)** để thu thập **Đom Đóm**, thắp sáng lại **5 Đèn Lồng Lớn** (`L1`..`L5`) và dùng sóng ánh sáng (**Tỏa sáng / Pulse**) để xua đuổi **Bóng Mực** trong sương đen.

---

## 2. Cài đặt và Chạy Game (Tối đa 3 lệnh)

Dự án được thiết kế **Zero-Dependency** (chạy trực tiếp bằng Node.js `>= 18` trên **macOS, Linux và Windows** mà không cần cài đặt thêm thư viện ngoài):

```bash
# Lệnh 1: Kiểm tra môi trường / Build
npm run build

# Lệnh 2: Chạy toàn bộ bộ kiểm thử tự động & sinh bằng chứng
npm run verify

# Lệnh 3: Khởi động Game 3D (mở http://localhost:3000 trên trình duyệt)
npm start
```

### Chạy Chế độ Headless (Theo Test Contract v1.0)
```bash
node src/headless.mjs --seed 1 --night 1 --ticks 600 --out out.jsonl --snapshot-every 10
```
Hoặc kèm file `--scenario` và `--inputs`:
```bash
node src/headless.mjs --seed 42 --night 1 --scenario docs/proof/phase1/scenarios/sc_win_all_lit.json --inputs docs/proof/phase1/scenarios/in_win_all_lit.json --ticks 100 --out out.jsonl
```

---

## 3. Điều khiển (Controls)

| Phím / Thao tác | Hành động trong Game 3D | Trường tương ứng trong `inputs.json` |
|---|---|---|
| `W`, `A`, `S`, `D` hoặc Phím mũi tên | Di chuyển Mây trên mặt đảo theo góc nhìn camera | `move: [x, z]` |
| `Q` / `R` hoặc **Kéo chuột trái** | Xoay góc nhìn Camera 3D quanh Mây | `cam_yaw_deg` |
| `Space` | Nhảy lên | `jump: true` (kích hoạt sườn lên `false -> true`) |
| `E` | Nạp đom đóm đang mang vào Đèn Lồng Lớn gần nhất (`<= 2.5m`) | `interact: true` (kích hoạt sườn lên `false -> true`) |
| `F` | Tỏa sáng (`Pulse`, tốn `1` đom đóm) làm choáng & đẩy lùi Bóng Mực trong bán kính `6.0m` | `pulse: true` (kích hoạt sườn lên `false -> true`) |

---

## 4. Thông số Tuning & Công thức Tính Điểm (`game.contract.json`)

Toàn bộ thông số được khai báo chính xác tại [`game.contract.json`](game.contract.json):
- **Di chuyển & Thu thập:** `player_speed = 8.0` m/s, `carry_capacity = 5` đom đóm, `pickup_radius = 1.5` m.
- **Đèn Lồng Lớn:** `lantern_count_night1 = 5` chiếc (`L1`..`L5`), mỗi đèn cần `lantern_cost = 3` đom đóm để sáng, `interact_radius = 2.5` m, `safe_radius = 5.0` m (Bóng Mực không thể đi vào bán kính `5.0` m quanh đèn đã thắp sáng).
- **Tỏa sáng (Pulse):** `pulse_cost = 1` đom đóm, `pulse_radius = 6.0` m, làm choáng `pulse_stun_s = 3.0` giây, đẩy lùi `pulse_push_m = 4.0` m, hồi chiêu `pulse_cooldown_s = 1.0` giây.
- **Máu & Bóng Mực:** `flames = 3` ngọn lửa, `invuln_s = 1.5` giây bất tử sau khi bị chạm, `hit_drop_ratio = 0.5` (rơi một nửa số đom đóm đang mang, làm tròn xuống), `shade_speed = 4.0` m/s, `shade_hit_radius = 1.0` m, `fall_enabled = false` (người chơi được giữ trong ranh giới đảo tròn bán kính `45m`, không rơi khỏi đảo).
- **Công thức Tính Điểm (`score`):**
  - Nhặt 1 đom đóm (`mote_picked`): **`+10` điểm** (`per_mote: 10`)
  - Thắp sáng 1 Đèn Lồng Lớn (`lantern_lit`): **`+100` điểm** (`per_lantern: 100`)
  - Làm choáng mỗi Bóng Mực khi tỏa sáng (`pulse`): **`+25` điểm / Bóng Mực** (`per_stun: 25`)
  - Khi **Thắng (`all_lit`)**: Cộng thưởng **`+5` điểm × số giây còn lại** (`Math.floor(time_left_s) * 5`) và **`+50` điểm × số máu còn lại** (`flames * 50`).

---

## 5. ✨ Sáng tạo của tôi (Rubric F — Creative Additions)

Chúng tôi bổ sung **2 tính năng sáng tạo** mang đậm bản sắc lễ hội đèn lồng Việt Nam, được thiết kế tách biệt hoàn toàn ở tầng hiển thị (`src/client/main.mjs`) để **không làm thay đổi bất kỳ byte nào của đầu ra Headless theo Test Contract**:

1. **Chuông gió Ngũ cung Tổng hợp Thời gian thực (Procedural Pentatonic Wind-Chime Audio):**
   - Dùng `Web Audio API` tổng hợp trực tiếp thang âm ngũ cung truyền thống (*Hò - Xự - Xang - Xê - Cống*) mỗi khi Mây nhặt đom đóm, hợp âm ấm áp khi thắp sáng Đèn Lồng Lớn, và âm vang sóng ánh sáng khi Tỏa sáng (`Pulse`).
2. **Tinh linh Hoa Đăng Dẫn đường (Guiding Spirit Wisp):**
   - Khi Mây đang mang đom đóm trên tay (`carried > 0`), một đốm **Tinh linh Hoa Đăng** màu vàng ấm sẽ bay lơ lửng phía trước mặt Mây theo hướng chỉ về **Đèn Lồng Lớn gần nhất chưa được thắp sáng**, giúp người chơi định hướng dễ dàng trong sương đêm.
- **Bằng chứng không ảnh hưởng Headless:** Toàn bộ `src/core/sim.mjs` không chứa bất kỳ thực thể phụ nào của phần sáng tạo; kết quả chạy `npm run verify` đạt **7/7 AC (100% PASS)** và kiểm tra tính tất định trùng khớp SHA-256 tuyệt đối.

---

## 6. Cấu trúc Tài liệu, Bằng chứng & Harness AI

| Đường dẫn | Nội dung |
|---|---|
| [`game.contract.json`](game.contract.json) | Khai báo lệnh build/run/headless và bộ số `tuning` theo Test Contract v1.0 |
| [`AGENTS.md`](AGENTS.md) | File hướng dẫn cố định cho AI Agent (kiến trúc, lệnh kiểm chứng, quy tắc Contract) |
| [`.agents/skills/verify-phase/SKILL.md`](.agents/skills/verify-phase/SKILL.md) | Skill tự động chạy kiểm chứng, kiểm tra tính tất định và sinh báo cáo bằng chứng |
| [`.agents/hooks/pre-commit`](.agents/hooks/pre-commit) | Git pre-commit hook chặn commit nếu `npm run verify` bị lỗi |
| [`.github/workflows/verify.yml`](.github/workflows/verify.yml) | GitHub Actions CI tự động chạy `npm run verify` trên Ubuntu sau mỗi lần push/tag |
| [`docs/notes/phase1-spec.md`](docs/notes/phase1-spec.md) | Giả định chi tiết, thứ tự xử lý tick và Tiêu chí Nghiệm thu Phase 1 |
| [`docs/notes/ai-log.md`](docs/notes/ai-log.md) | Nhật ký dùng AI, phân tích lỗi AI, đánh giá từng phase và thống kê ước tính Token |
| [`docs/proof/phase1/PROOF_PHASE1.md`](docs/proof/phase1/PROOF_PHASE1.md) | Báo cáo bằng chứng Phase 1 kèm bảng truy vết, scenarios đầu vào và `.jsonl` đầu ra thật |
| [`CREDITS.md`](CREDITS.md) & [`LICENSE`](LICENSE) | Ghi nguồn tài sản bản gốc và giấy phép MIT |
