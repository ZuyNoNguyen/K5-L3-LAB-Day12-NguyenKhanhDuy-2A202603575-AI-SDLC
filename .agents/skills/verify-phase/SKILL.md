---
name: verify-phase
description: Quy trình tự động kiểm chứng Test Contract v1.1, kiểm tra hồi quy (regression), tính tất định (determinism), đo hiệu năng 21,600 ticks <= 30s và lưu bằng chứng thật cho từng Phase của Đảo Đèn Lồng.
---

# Skill: Verify Phase & Generate Proof (Phase 2 / Contract v1.1)

Sử dụng skill này trước khi kết thúc mỗi Phase hoặc trước mỗi lần gắn tag `phase-N`.

## Các bước thực hiện
1. **Chạy bộ kiểm thử tự động & sinh bằng chứng:**
   ```bash
   npm run verify
   ```
2. **Kiểm tra các hạng mục bắt buộc trong output (Contract v1.1):**
   - Kiểm tra hồi quy Đêm 1 với bộ số liệu chuẩn mới (`lantern_cost: 10`, `pulse_cost: 3`, `score.per_mote: 10` khi nạp).
   - Kiểm tra toàn bộ tính năng mới của Phase 2:
     - Lướt (`dash`) và Rơi khỏi đảo (`Y < -10`, `player_hit` với `by: "fall", lost: n`, hồi sinh sau 60 tick).
     - Đêm 2 (Đảo Cau): Cầu tre và Bục nhảy (`(20,0,18)` & `(50,0,-18)`).
     - Đêm 3 (Đảo Chuông): 3 tầng (`Y=0`, `Y=3`, `Y=6`), 2 dốc `30°`/`150°`, Bục nhảy `(0,3,13)` và Gió mạnh (`wind`).
     - Gió Lạc (`drifters`: `idle -> chase -> steal -> flee -> pulse drop`).
     - Bùa Gió (`charms`: `charm_picked`, tốc độ `7.2 m/s`, Lướt không hồi chiêu).
     - Tạm dừng (`pause` / `paused` / `resumed`).
   - Kiểm tra hiệu năng Headless: Chạy 1 Đêm đầy đủ `21,600` ticks phải hoàn thành trong `<= 30 giây`.
   - Kiểm tra tính tất định (Determinism check): 2 lần chạy cùng `--seed`, `--night`, `--scenario`, `--inputs` phải khớp hash SHA-256 tuyệt đối.
3. **Kiểm tra file bằng chứng:**
   - Đảm bảo `docs/proof/phase2/PROOF_PHASE2.md` và các file `.jsonl` được cập nhật sạch sẽ, khớp mã nguồn trước khi commit và gắn tag `phase-2`.
