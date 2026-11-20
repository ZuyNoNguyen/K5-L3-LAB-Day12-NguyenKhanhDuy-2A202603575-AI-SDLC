# Phase 1 Specification & Assumptions (PRD-0 · Đảo Đèn Lồng)

## 1. Phân tích Yêu cầu & Giả định (Assumptions)

PRD-0 mô tả tổng quát màn chơi **Đêm 1 – Đảo Bến** và quy định chính xác **Test Contract v1.0**. Dưới đây là các giả định hợp lý cho những chi tiết PRD-0 để mở, đối chiếu trực tiếp với `game.contract.json`:

| Hạng mục | Quy định trong PRD-0 / Contract | Giả định cụ thể của chúng tôi (Phase 1) |
|---|---|---|
| **Hình học Đảo Bến** | Hòn đảo tròn, mặt đất tại `Y = 0`, xuất phát tại `(0, 0, 0)` | Bán kính đảo `ISLAND_RADIUS = 45.0` m. Với `fall_enabled: false` trong `game.contract.json`, người chơi được giữ trong ranh giới đảo (`r <= 45.0` m) nên không bị rơi khỏi đảo. |
| **5 Đèn Lồng Lớn (`L1`..`L5`)** | 5 Đèn Lồng Lớn trên Đảo Bến | Mặc định xếp trên đường tròn bán kính `25.0` m quanh tâm đảo: `L1: (0, 0, 25)`, `L2: (23.776, 0, 7.725)`, `L3: (14.695, 0, -20.225)`, `L4: (-14.695, 0, -20.225)`, `L5: (-23.776, 0, 7.725)`. Mỗi đèn cần `lantern_cost = 3` đom đóm để sáng (`lit: true`). |
| **Di chuyển & Nhảy (`player`)** | `player_speed`, nhảy, camera 3D | `player_speed = 8.0` m/s (`8/60` m/tick). Nhảy (`jump` chuyển từ `false -> true` khi `Y == 0`) cho vận tốc dọc `vy = 6.0` m/s, trọng lực `g = 18.0` m/s², rơi xuống không thấp hơn `Y = 0`. Vì khoảng cách contract tính trên mặt phẳng ngang **XZ**, nhảy không làm sai lệch khoảng cách nhặt/tương tác/va chạm XZ. |
| **Thu thập Đom Đóm (`motes`)** | Xuất hiện rải rác, tự nhặt trong `pickup_radius` | `pickup_radius = 1.5` m, `carry_capacity = 5`. Khi `random_motes !== false`, ban đầu sinh tất định `20` đom đóm (`M1`..`M20`) theo `--seed`, và nếu tổng số đom đóm trên sân `< 15` thì mỗi `180` ticks (3 giây) sinh thêm 1 đom đóm ở vị trí ngẫu nhiên trên đảo. Tự động nhặt trong mỗi bước khi khoảng cách XZ `<= 1.5` m và `carried < carry_capacity`. |
| **Nạp Đèn Lồng (`interact`)** | Nạp ánh sáng vào đèn để thắp đèn | `interact_radius = 2.5` m. Khi nút `interact` chuyển từ `false -> true` (rising edge) và `carried > 0`, tìm Đèn Lồng gần nhất trong bán kính `<= 2.5` m chưa sáng (`!lit`). Số lượng nạp `amount = Math.min(carried, lantern_cost - lantern.deposited)`. Nếu `amount > 0`: giảm `carried`, tăng `deposited`, phát event `deposit`. Nếu `deposited >= lantern_cost`: đặt `lit = true`, cộng `score.per_lantern` (`100`), phát event `lantern_lit`. |
| **Tỏa sáng (`pulse`)** | Tốn ánh sáng để xua Bóng Mực | `pulse_cost = 1`, `pulse_radius = 6.0` m, `pulse_stun_s = 3.0` s (`180` ticks), `pulse_push_m = 4.0` m, `pulse_cooldown_s = 1.0` s (`60` ticks). Khi nút `pulse` chuyển từ `false -> true`, nếu `carried >= 1` và hết cooldown: trừ `1` `carried`, đặt cooldown `60` ticks, tìm mọi Bóng Mực trong bán kính XZ `<= 6.0` m, chuyển trạng thái chúng sang `stunned` trong `180` ticks, đẩy lùi `4.0` m ra xa vị trí người chơi, cộng `score.per_stun` (`25`) cho mỗi Bóng Mực bị choáng, và phát event `pulse` kèm `stunned_ids`. |
| **Bóng Mực (`shades`) & Vùng an toàn (`safe_radius`)** | Đuổi theo Mây, sợ những chiếc đèn, chạm vào mất máu | `shade_speed = 4.0` m/s, `shade_hit_radius = 1.0` m, `safe_radius = 5.0` m quanh các Đèn Lồng **đã sáng (`lit: true`)**. Khi `random_shades !== false`, ban đầu có 3 Bóng Mực (`S1`..`S3`) và mỗi `900` ticks (15 giây) sinh thêm 1 Bóng Mực (tối đa 6, phát event `shade_spawned`). Khi không bị `stunned`, Bóng Mực ở trạng thái `chase` đuổi theo người chơi, nhưng nếu bước di chuyển đưa nó vào trong `safe_radius` (`<= 5.0` m) của bất kỳ đèn nào đã `lit: true`, nó bị đẩy ra rìa `safe_radius` của đèn đó. |
| **Mất máu (`player_hit`) & Bất tử (`invuln_s`)** | Chạm Bóng Mực mất máu, rơi đom đóm | `flames = 3`, `invuln_s = 1.5` s (`90` ticks), `hit_drop_ratio = 0.5`. Khi không trong thời gian bất tử (`invuln_ticks == 0`) và có Bóng Mực (không bị `stunned`) ở khoảng cách XZ `<= 1.0` m: trừ `1` `flames`, số đom đóm rơi `dropped = Math.floor(carried * 0.5)`, `carried -= dropped`, đặt `invuln_ticks = 90`, phát event `player_hit` với `{"by":"shade","flames":n,"dropped":dropped}`. |
| **Thắng / Thua & Điểm số (`score`)** | Thắp hết đèn thì thắng; hết máu hoặc hết giờ thì thua | `night1_duration_s = 180` s (`10800` ticks). Điểm: `per_mote = 10`, `per_lantern = 100`, `per_stun = 25`, `per_second_left = 5`, `per_flame_left = 50`. Ngay trong tick mà cả 5 đèn đều `lit: true` → `state = "won"`, cộng `Math.floor(time_left_s) * 5 + flames * 50`, phát event `game_over` (`result: "won", reason: "all_lit"`). Nếu `flames <= 0` → `state = "lost"`, phát `game_over` (`result: "lost", reason: "no_flames"`). Nếu hết giờ (`time_left_s <= 0`) mà chưa thắng → `state = "lost"`, phát `game_over` (`result: "lost", reason: "dawn"`). |

---

## 2. Thứ tự Xử lý trong 1 Bước (Tick Execution Order)

Để đảm bảo tính tất định 100% và dễ kiểm chứng, mỗi bước `k` (`k = 0 .. N-1`, tạo trạng thái tại `tick = k + 1`) thực hiện theo thứ tự cố định:
1. Đọc frame input có `tick === k` (nếu có), cập nhật trạng thái giữ phím và phát hiện sườn lên (`false -> true`) của `jump`, `interact`, `pulse`.
2. Giảm các bộ đếm thời gian (`invuln_ticks`, `pulse_cooldown_ticks`, `stun_ticks` của từng Bóng Mực).
3. Cập nhật vị trí người chơi (`player.pos`) theo vector `move` và `cam_yaw_deg`, xử lý nhảy dọc trục Y.
4. Kiểm tra tự động nhặt đom đóm (`pickup_radius <= 1.5` m) → phát event `mote_picked`, cộng `score.per_mote`.
5. Xử lý hành động `interact` (nếu có sườn lên) → nạp đom đóm vào đèn gần nhất `<= 2.5` m → phát event `deposit` và (nếu đủ `lantern_cost`) `lantern_lit`, cộng `score.per_lantern`.
6. Xử lý hành động `pulse` (nếu có sườn lên, `carried >= pulse_cost`, cooldown `== 0`) → làm choáng & đẩy lùi Bóng Mực trong `<= 6.0` m → phát event `pulse`, cộng `score.per_stun`.
7. Cập nhật di chuyển của các Bóng Mực không bị `stunned` (đuổi theo người chơi, tôn trọng `safe_radius` quanh đèn đã sáng) và kiểm tra sinh thêm đom đóm / Bóng Mực định kỳ (nếu `random_motes` / `random_shades` bật).
8. Kiểm tra va chạm Bóng Mực với người chơi (`<= 1.0` m, khi `invuln_ticks == 0` và Bóng Mực không bị `stunned`) → phát event `player_hit`.
9. Cập nhật `time_left_s = night1_duration_s - (k + 1) / 60`. Kiểm tra điều kiện kết thúc game (`all_lit`, `no_flames`, `dawn`) → nếu kết thúc, phát event `game_over` và dừng vòng lặp sau khi ghi snapshot (nếu trúng kỳ snapshot) + dòng `end`.

---

## 3. Tiêu chí Nghiệm thu & Kế hoạch Kiểm chứng (Acceptance Criteria)

| Mã AC | Yêu cầu | Cách kiểm chứng (Before coding) | Bằng chứng kỳ vọng |
|---|---|---|---|
| **AC-1.1** | `game.contract.json` & CLI Headless đúng chuẩn | Chạy `node src/headless.mjs` với đầy đủ cờ `--seed`, `--night`, `--scenario`, `--inputs`, `--ticks`, `--out`, `--snapshot-every` | File `.jsonl` hợp lệ, dòng đầu là snapshot tick 0, dòng cuối là `type: "end"`, exit code `0`. |
| **AC-1.2** | Di chuyển theo `cam_yaw_deg` & Nhặt đom đóm (`mote_picked`) | Scenario đặt đom đóm tại `(0, 0, 5)` và `(5, 0, 5)`, dùng `move` + `cam_yaw_deg: 90` | Event `mote_picked` nổ đúng tick dự kiến, `carried` và `score` tăng đúng. |
| **AC-1.3** | Nạp đèn (`deposit`) & Thắp sáng (`lantern_lit`) + Thắng (`all_lit`) | Scenario đặt 4 đèn đã sáng, đèn `L1` tại `(0, 0, 2)`, người chơi mang 3 đom đóm bấm `interact` | Event `deposit`, `lantern_lit`, `game_over` (`won`, `all_lit`), dừng ngay và tính đúng điểm thưởng. |
| **AC-1.4** | Tỏa sáng (`pulse`) làm choáng và đẩy lùi Bóng Mực | Scenario đặt Bóng Mực `S1` cách 3m, người chơi mang 1 đom đóm bấm `pulse` | Event `pulse` với `stunned_ids: ["S1"]`, `S1.state === "stunned"`, khoảng cách tăng thêm `4.0` m. |
| **AC-1.5** | Bóng Mực chạm mất máu (`player_hit`) & Thua (`no_flames`) | Scenario đặt người chơi `flames: 1`, `carried: 4`, Bóng Mực `S1` chạm người chơi | Event `player_hit` (`flames: 0, dropped: 2`), tiếp theo là `game_over` (`lost`, `no_flames`). |
| **AC-1.6** | Hết giờ (`dawn`) & Vùng an toàn (`safe_radius`) | Scenario `time_left_s: 1` chạy 60 ticks; Scenario đặt Bóng Mực đuổi người chơi đứng cạnh đèn đã sáng | Event `game_over` (`lost`, `dawn`); Bóng Mực không thể tiến vào bán kính `< 5.0` m của đèn đã sáng. |
| **AC-1.7** | Tính tất định (Determinism) & Xử lý lỗi input (Exit code `2`) | Chạy 2 lần cùng `--seed 42`, so sánh SHA-256; chạy với file `inputs` có `tick` giảm dần | Hash SHA-256 trùng khớp 100%; file lỗi trả về exit code `2` và in lỗi ra `stderr`. |
| **AC-1.8** | Game 3D chơi được + Tính năng sáng tạo không ảnh hưởng headless | Mở trình duyệt chơi thử, kiểm tra HUD, nón lá Mây, âm thanh & Tinh linh Hoa Đăng | Ảnh chụp màn hình 3D + headless test vẫn xanh 100%. |
