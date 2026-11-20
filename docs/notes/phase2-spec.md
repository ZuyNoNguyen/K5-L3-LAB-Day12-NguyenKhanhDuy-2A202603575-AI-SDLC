# Phase 2 Specification & Assumptions (TICKET-02 · "Ba hòn đảo" · Contract v1.1)

## 1. Bảng Thay đổi Yêu cầu từ Phase 1 sang Phase 2 (Requirement Changes & Regression Notes)

Ticket-02 chuẩn hóa toàn bộ thông số (`tuning`) và nâng cấp Test Contract lên **v1.1** kèm 3 Đêm chơi. Dưới đây là những thay đổi làm thay thế giả định/test của Phase 1 (được ghi nhận rõ để cập nhật test cũ):

| Hạng mục | Phase 1 (Giả định tự chọn) | Phase 2 (Số liệu chuẩn bắt buộc - Ticket-02) | Lý do cập nhật Test cũ |
|---|---|---|---|
| **Tốc độ chạy & Sức chứa** | `player_speed: 8.0`, `carry_capacity: 5` | `player_speed: 6.0`, `carry_capacity: 10`, `pickup_radius: 1.0`, chênh cao `<= 1.5` m | Chuẩn hóa cảm giác điều khiển theo Phần 1 Ticket-02. |
| **Đèn lồng (`lantern_cost`)** | `lantern_cost: 3`, `interact_radius: 2.5`, `safe_radius: 5.0` | `lantern_cost: 10`, `interact_radius: 2.0`, `safe_radius: 6.0` (chọn đèn gần nhất, bằng nhau chọn `id` nhỏ hơn) | Chuẩn hóa chi phí thắp đèn và vùng an toàn. |
| **Tỏa sáng (`pulse`)** | `pulse_cost: 1`, `pulse_radius: 6.0`, `pulse_stun_s: 3.0`, `pulse_cooldown_s: 1.0`, `per_stun: 25` | `pulse_cost: 3`, `pulse_radius: 5.0` (khoảng cách 3D từ `chân Mây + 0.8m` tới tâm Bóng Mực `<= 5.0m`), `pulse_stun_s: 2.0` (120 tick, 15 tick đầu đẩy lùi tổng 4m), `pulse_cooldown_s: 3.0`, `per_stun: 5` | Chuẩn hóa cơ chế chiến đấu & điểm thưởng. |
| **Điểm số (`score`)** | Cộng `+10` khi **nhặt** đom đóm; thắng cộng `5 * sec + 50 * flames` | Cộng `+10` mỗi đom đóm khi **nạp vào đèn** (`deposit`); `+100` mỗi đèn thắp; `+5` mỗi Bóng Mực trúng Pulse; khi thắng cộng `floor(time_left_s) * 2 + 50 * flames` | Ticket-02 quy định rõ: `+10 mỗi đom đóm nạp`, `per_second_left = 2`. |
| **Rơi khỏi đảo (`fall_enabled`)** | `fall_enabled: false` (chặn ở rìa) | `fall_enabled: true`: Ra ngoài đảo bị rơi tự do; khi `Y < -10`: trừ 1 Ngọn Lửa (bỏ qua bất tử), mất toàn bộ đom đóm (`lost`), phát `player_hit` (`by: "fall", flames, dropped: 0, lost`), chờ 60 tick rồi hồi sinh ở `(0,0,0)` với `invuln_ticks = 90` (nếu hết Ngọn Lửa thì thua ngay `no_flames`). | Chuẩn hóa vật lý rơi xuống biển mây ở cả 3 Đêm. |

---

## 2. Giả định Chi tiết cho các Cơ chế Mới (Ticket-02 Assumptions)

1. **Vật lý Di chuyển, Nhảy, Bục nhảy & Rơi:**
   - Tăng tốc/dừng tức thời ở mỗi tick (`1/60s <= 0.1s`) tới vận tốc mục tiêu `6.0 m/s` (hoặc `7.2 m/s` khi có Bùa Gió `charm_ticks > 0`).
   - Khi đang Lướt (`dash_ticks > 0`, kéo dài `12` tick = `0.2s`), tốc độ ngang là `14.0 m/s` theo hướng đang di chuyển (hoặc hướng quay mặt nếu `move == [0,0]`, mặc định ban đầu quay mặt về `+Z`), giữ nguyên độ cao `Y` (`vy = 0`).
   - Khi chạm Bục nhảy (bán kính XZ `<= 1.0 m` và `|Y - pad.y| <= 0.5 m`), Mây được gắn vận tốc phóng `(vx, vy, vz)` cố định cho tới khi chạm mặt đất hợp lệ (trong thời gian bay bục nhảy, phím di chuyển không ghi đè vận tốc phóng trừ khi người chơi bấm `dash`).
2. **Độ cao Mặt đất (`getGroundHeight(x, z, currentY)`) cho 3 Đêm:**
   - **Đêm 1 (Đảo Bến):** Mặt đất `Y = 0` nếu `hypot(x, z) <= 40.0`. Ngoài `40.0` m không có đất (`null` → rơi tự do với `g = -20 m/s²`).
   - **Đêm 2 (Đảo Cau):** Mặt đất `Y = 0` nếu thuộc Đảo A (`hypot(x, z) <= 28.0`), Đảo B (`hypot(x - 70, z) <= 28.0`), hoặc Cầu tre (`26.0 <= x <= 44.0` và `-2.0 <= z <= 2.0`). Ngoài vùng này là biển mây (`null` → rơi).
   - **Đêm 3 (Đảo Chuông):**
     - Ngoài bán kính `45.0` m: không có đất (`null` → rơi).
     - Tháp chuông ở tâm tầng 2 (`hypot(x, z) < 2.0` và `Y >= 6.0`): hình trụ cản ngang, đẩy ra bán kính `2.0` m.
     - Tầng 2 (`Y = 6.0`): đĩa bán kính `r <= 8.0` m (chỉ đứng được nếu độ cao nhân vật `>= 5.8` m hoặc bay từ trên đáp xuống).
     - Dốc thẳng (2 dốc ở góc `30°` và `150°`, rộng `3.0` m, tức khoảng cách vuông góc tới tia `<= 1.5` m, bán kính dọc tia `r_proj` từ `24.0` đến `30.0` m): độ cao mặt dốc nội suy tuyến tính `Y = 3.0 * (30.0 - r_proj) / 6.0`. Nhân vật đi bộ lên/xuống dốc mượt mà.
     - Tầng 1 (`Y = 3.0`): vành khăn `12.0 <= r <= 24.0` ở nửa `z > 0` (chỉ đứng được nếu nhân vật đang ở độ cao `>= 2.5` m, đi từ dốc lên, hoặc rơi từ tầng 2 xuống).
     - Tầng 0 (`Y = 0.0`): toàn bộ đảo `r <= 45.0` m.
3. **Trạng thái Bóng Mực (`spawning`, `wander`, `chase`, `recoil`, `stunned`):**
   - Mới sinh theo lịch ở trong trận: ở trạng thái `spawning` trong `30` tick đầu (hoặc `wander` nếu đặt sẵn từ `scenario` không ghi `state`), không tương tác ở đúng tick vừa sinh.
   - Khi hoạt động: nếu khoảng cách XZ tới Mây `<= 12.0` m thì chuyển sang `chase`; nếu đang `chase` mà khoảng cách `> 18.0` m thì về `wander` (đi chậm `1.5 m/s` quanh điểm sinh).
   - Khi gây sát thương cho Mây: chuyển sang `recoil` trong `60` tick, lùi ra xa Mây tổng cộng `2.0` m (`2.0 / 60` m mỗi tick).
   - Khi bị Tỏa Sáng (`pulse`): chuyển sang `stunned` trong `120` tick (`state_ticks_left = 120`), trong `15` tick đầu mỗi tick bị đẩy lùi `4.0 / 15` m theo phương ngang (dừng nếu chạm mép đảo hoặc vùng an toàn đèn).
   - Khi một Đèn Lồng vừa được thắp sáng (`lantern_lit`), mọi Bóng Mực đang ở trong bán kính `< 6.0` m của đèn đó được gắn cờ đẩy ra mép `6.0` m trong tối đa `30` tick (`0.2` m/tick) và không gây sát thương trong lúc đang bị đẩy.

---

## 3. Tiêu chí Nghiệm thu Phần 3 & Contract v1.1 (Acceptance Criteria)

| Mã AC | Tính năng / Yêu cầu (Ticket-02) | Cách kiểm chứng (Scenario Headless / Test) | Kết quả kỳ vọng |
|---|---|---|---|
| **AC-2.1** | **Chuẩn hóa Tuning & Contract v1.1 + Regression Phase 1** | Kiểm tra `game.contract.json` (`contract_version: "1.1"`, đầy đủ khóa mới) & chạy lại các kịch bản cốt lõi của Đêm 1 với số liệu mới (`lantern_cost: 10`, `pulse_cost: 3`, `score.per_mote: 10` khi nạp) | Snapshot có đủ `night`, `wind`, `player.{vel,grounded,invuln,dash_cd_s,pulse_cd_s,charm_s}`, `motes`, `drifters`, `charms`. |
| **AC-2.2** | **Lướt (`dash`) & Rơi khỏi đảo (`fall`) + Hồi sinh** | Scenario cho Mây bấm `dash: true` (kiểm tra event `dash`, dịch chuyển `14 m/s` trong `0.2s`), sau đó chạy ra khỏi mép đảo `r > 40m` tới khi `Y < -10` | Phát event `player_hit` với `by: "fall", lost: n`, chờ 60 tick rồi hồi sinh tại `(0,0,0)` với `invuln_ticks = 90`. |
| **AC-2.3** | **Đêm 2 (Đảo Cau): Cầu tre & Bục nhảy (`jump_pad`)** | Scenario `--night 2` cho Mây chạm bục nhảy tại `(20, 0, 18)` | Mây bay lên với `vy = 14 m/s`, vận tốc ngang `24 m/s` hướng về tâm Đảo B `(70, 0, 0)` và đáp xuống Đảo B an toàn. |
| **AC-2.4** | **Đêm 3 (Đảo Chuông): 3 Tầng, Dốc, Bục nhảy & Gió mạnh (`wind`)** | Scenario `--night 3` kiểm tra leo dốc `30°` lên Tầng 1 (`Y = 3`), chạm bục nhảy `(0, 3, 13)` lên Tầng 2 (`Y = 6`) và kiểm tra gió mạnh đẩy `2 m/s` | Độ cao `player.pos[1]` đạt `3.0` trên Tầng 1, `6.0` trên Tầng 2; `wind.active` bật đúng chu kỳ và đẩy nhân vật. |
| **AC-2.5** | **Gió Lạc (`drifters`: `idle -> chase -> steal -> flee -> pulse drop`)** | Scenario đặt Gió Lạc `D1` gần Mây đang mang `6` đom đóm: kiểm tra `D1` chuyển `chase`, chạm cướp `3` đom đóm (`drifter_steal`), chuyển `flee`; Mây bấm `pulse` đánh rơi lại `3` đom đóm (`drifter_drop`) | Phát đủ event `drifter_steal` (`amount: 3, carried: 3`) và `drifter_drop` (`amount: 3`), sinh đom đóm rơi `kind: "dropped"`. |
| **AC-2.6** | **Bùa Gió (`charms`: `charm_picked`, tốc độ `7.2 m/s`, lướt 0s cooldown)** | Scenario đặt Mây nhặt Bùa `C1` tại `(35, 0, 0)` ở Đêm 2, sau đó bấm `dash` 2 lần liên tiếp ngay sau khi kết thúc lướt lần 1 | Phát event `charm_picked` (`charm_id: "C1", charm_ticks: 600`), tốc độ chạy tăng lên `7.2 m/s`, `dash_cd_s === 0` cho phép lướt liên tiếp. |
| **AC-2.7** | **Tạm dừng (`pause` / `paused` / `resumed`)** | Scenario gửi `pause: true` ở tick 10 và `pause: true` lần nữa ở tick 20 | Phát event `paused` ở tick 11, các snapshot trong lúc pause có `state: "paused"`, `sim_tick` và `time_left_s` giữ nguyên; tick 21 phát `resumed`. |
| **AC-2.8** | **Hiệu năng Headless (`21,600 ticks <= 30s`) & Tính tất định v1.1** | Chạy full 1 Đêm `21,600` ticks ở chế độ headless và đo thời gian thực thi; chạy 2 lần cùng seed kiểm tra SHA-256 | Hoàn thành `21,600` ticks trong `< 2 giây` (nhanh hơn ngưỡng 30s gấp 15 lần) và trùng khớp SHA-256 100%. |
| **AC-2.9** | **Giao diện 3D 3 Đêm, Menu, Pause, Cài đặt, HUD chuẩn & Bảng màu chuẩn** | Kiểm tra `src/client/` hỗ trợ chuỗi 3 Đêm, lời Ông Đăng, Pause menu, lưu Settings (`localStorage`), thanh đom đóm 10 ô, mũi tên chỉ đèn ngoài màn hình và bảng màu Hex chuẩn | Đầy đủ tính năng UI/UX & >= 30 FPS ổn định ở `1280x720`. |
