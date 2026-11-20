# AGENTS.md — Đảo Đèn Lồng (AI SDLC Harness · Phase 2 / Contract v1.1)

## 1. Kiến trúc & Nguyên tắc cốt lõi
- **Tách biệt hoàn toàn Core Logic & 3D Client:**
  - `src/core/sim.mjs`: Toàn bộ logic simulation 60 ticks/s cho **3 Đêm (Đảo Bến, Đảo Cau, Đảo Chuông)**, PRNG tất định (`mulberry32`), vật lý 3D (nhảy, lướt `dash`, bục nhảy, dốc 3 tầng, rơi `Y < -10`), Gió Lạc (`drifters`), Bùa Gió (`charms`), Gió mạnh (`wind`). **CẤM** import DOM, WebGL, `Math.random()`, hay `Date.now()` trong `src/core/`.
  - `src/headless.mjs`: CLI chạy `src/core/sim.mjs` theo đúng `game.contract.json` (**Test Contract v1.1**, hỗ trợ `--night 1|2|3`).
  - `src/client/`: Giao diện 3D góc nhìn thứ ba (Zero-dependency 3D Perspective Canvas Engine) theo đúng bảng màu chuẩn Hex, chuỗi 3 Đêm, Pause menu, Settings và tính năng sáng tạo thêm.

## 2. Lệnh Build, Chạy & Kiểm chứng
- Cài đặt / Build: `npm run build`
- Mở game 3D: `npm start` (`http://localhost:3000`)
- Chạy Headless: `node src/headless.mjs --seed 1 --night 1 --ticks 600 --out out.jsonl`
- Chạy toàn bộ Test & Sinh bằng chứng: `npm run verify`

## 3. Quy tắc Bắt buộc (Test Contract v1.1)
- **Thứ tự xử lý 12 bước trong 1 tick:**
  1. Đọc input (xử lý `pause` trước; nếu đang `paused` thì `tick` tăng nhưng `sim_tick`, thời gian, cooldown, spawn, TTL đứng yên, snapshot ghi `state: "paused"`).
  2. Giảm các bộ đếm (`time_left_s`, cooldown, `invuln`, `stun`, `charm`, TTL đom đóm rơi, respawn bùa).
  3. Di chuyển Mây (nhảy, lướt `dash`, bục nhảy, gió) rồi kiểm tra rơi khỏi đảo (`Y < -10`).
  4. Nhặt đom đóm (`XZ <= 1.0m`, `|dy| <= 1.5m`) và Bùa Gió (`charm_picked`).
  5. Tương tác với đèn (`XZ <= 2.0m`, chọn đèn chưa sáng gần nhất, bằng nhau chọn `id` nhỏ hơn). Cộng `+10` điểm mỗi đom đóm nạp (`deposit`), `+100` khi đèn sáng (`lantern_lit`).
  6. Cập nhật vùng an toàn (`safe_radius = 6.0m`, đẩy bóng bên trong khi đèn vừa sáng ra mép trong tối đa 30 tick và không gây sát thương).
  7. Tỏa Sáng (`pulse`: tốn 3 đom đóm, bán kính 3D `<= 5.0m` từ `chân Mây + 0.8m` tới tâm Bóng Mực; choáng 120 tick, 15 tick đầu đẩy lùi 4m; tác động lên Gió Lạc `chase`/`flee`).
  8. Di chuyển Bóng Mực (`spawning`, `wander`, `chase`, `recoil`, `stunned`) và Gió Lạc (`idle`, `chase`, `flee`, `removed`).
  9. Chạm: Gió Lạc cướp trước (`XZ <= 1.2m` → `drifter_steal`), rồi Bóng Mực gây hit (`XZ <= 1.0m`, `|dy| <= 1.5m`, xét theo `id` tăng dần → `player_hit`, rơi `floor(carried/2)` đom đóm tồn tại 480 tick).
  10. Sinh đom đóm, Bóng Mực, Gió Lạc theo lịch (chỉ tương tác từ tick sau).
  11. Xét thắng/thua (`no_flames` → `all_lit` → `dawn`).
  12. Ghi snapshot nếu tới lượt.

## 4. Quy trình làm việc cho Agent
1. Cập nhật giả định và lý do thay đổi test cũ vào `docs/notes/phaseN-spec.md` trước khi sửa code.
2. Chạy `npm run verify` xanh 100% và kiểm tra bằng chứng trong `docs/proof/phaseN/` trước khi commit.
