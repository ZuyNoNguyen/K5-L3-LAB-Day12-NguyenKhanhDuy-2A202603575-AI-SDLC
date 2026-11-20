# Nhật ký Dùng AI, Đánh giá Từng Phase & Quản lý Token (AI Log & Evaluation)

## 1. Chiến lược Quản lý Token & Tiết kiệm Chi phí
Để tối ưu hóa quota token trong suốt 4 giờ lab:
1. **Zero-dependency Architecture:** Sử dụng Pure Node.js ESM (`src/core/sim.mjs`) cho cả Headless CLI và 3D Web Client, không cài đặt hàng trăm MB thư viện, không tốn token debug lỗi bundler/webpack/typescript.
2. **Thiết kế Test-First:** Viết rõ `docs/notes/phase1-spec.md` và bộ kiểm chứng `tests/verify.mjs` bám sát 100% `Test Contract v1.0` ngay từ đầu nên không phải sửa đi sửa lại.
3. **AGENTS.md ngắn gọn (< 45 dòng):** Chỉ lưu đúng quy tắc bất biến của Test Contract, tránh làm phình ngữ cảnh mỗi lượt gọi agent.
4. **Phân quyền Subagent hợp lý:** Dùng model `flash` cho subagent trình duyệt (`browser`) và subagent kiểm tra độc lập (`research`), giữ ngữ cảnh chính luôn sạch.

### Bảng Ước tính Token & Chi phí theo Phase

| Phase | Công việc chính | Số lượt Prompt chính | Ước tính Input Tokens | Ước tính Output Tokens | Chi phí quy đổi ước tính (USD) | Cách tiết kiệm đã áp dụng |
|---|---|---:|---:|---:|---:|---|
| **Phase 1 (PRD-0)** | Đọc repo & Lab Board, thiết kế Harness, xây dựng Core Sim + Headless CLI + 3D Client, chạy Verify & Independent Review | 3 | ~32,000 | ~8,500 | ~$0.18 | Đọc 6 file tài liệu trong 1 turn song song; dùng `flash` cho browser subagent; viết core zero-dependency chạy đúng ngay lần đầu. |
| **Phase 2 (Ticket-02)** | *(Cập nhật khi Phase 2 mở)* | - | - | - | - | - |
| **Phase 3 (Ticket-03)** | *(Cập nhật khi Phase 3 mở)* | - | - | - | - | - |
| **Phase 4 (Ticket-04)** | *(Cập nhật khi Phase 4 mở)* | - | - | - | - | - |

---

## 2. Nhật ký Lỗi của AI & Cách Điều chỉnh Harness (AI Error Analysis)

| Thời điểm | Tình huống / Nguy cơ lỗi của AI | Cách phát hiện | Điều chỉnh vào Harness / Code |
|---|---|---|---|
| **Phase 1 (Thiết kế)** | Nguy cơ `Math.round(val * 1000) / 1000` trong JS tạo ra `-0` khi làm tròn số âm rất nhỏ, làm lệch chuỗi JSON so với `0`. | Rà soát toán học khi viết hàm `round3()` trong `src/core/sim.mjs`. | Bổ sung `Object.is(r, -0) ? 0 : r` trong `round3()` để đảm bảo tọa độ JSONL sạch tuyệt đối. |
| **Phase 1 (Input Edge)** | Nguy cơ nút `interact` hoặc `pulse` kích hoạt liên tục mỗi tick nếu người chơi giữ phím, trái với quy định *"chuyển từ `false` sang `true`"* của Test Contract. | Đối chiếu mục C của Test Contract v1.0. | Lưu trạng thái `this.inputState.interact` và chỉ bật cờ `interactTriggered` ở sườn lên (`!prev && next`), đồng thời ghi rõ vào `AGENTS.md` mục 3. |
| **Phase 1 (3D Client W/S Mapping)** | Trong `src/client/main.mjs`, phím `W`/`S` bị gán ngược dấu (`mz -= 1` khi `camYawDeg = 180`), làm bấm `W` đi lùi về phía camera. | Phát hiện bởi **Independent QA Reviewer Subagent** trong bước kiểm tra chéo độc lập. | Đổi `camYawDeg = 0` và chuẩn hóa `W -> mz += 1`, `S -> mz -= 1`, `A -> mx -= 1`, `D -> mx += 1`, đồng thời thêm `AC-1.8` vào `tests/verify.mjs`. |

---

## 3. Đánh giá Phase 1 (Phase 1 Evaluation)

- **Yêu cầu đạt được (7/7 AC — 100%):**
  - `game.contract.json` khai báo đầy đủ, chính xác mọi thông số `tuning`.
  - Chế độ headless (`node src/headless.mjs`) hỗ trợ đầy đủ `--seed`, `--night`, `--scenario`, `--inputs`, `--ticks`, `--out`, `--snapshot-every`, xuất đúng định dạng JSONL (`snapshot`, `event`, `end`).
  - Đầy đủ 7 loại sự kiện: `mote_picked`, `deposit`, `lantern_lit`, `pulse`, `player_hit`, `shade_spawned`, `game_over` (`all_lit`, `no_flames`, `dawn`).
  - Tính tất định (Determinism): 2 lần chạy cùng seed cho mã băm SHA-256 trùng khớp 100%.
  - Kiểm tra lỗi đầu vào: file `inputs` có `tick` không tăng nghiêm ngặt thoát đúng mã `2` và ghi lỗi ra `stderr`.
  - Game 3D góc nhìn thứ ba chơi được mượt mà, có Mây đội nón lá treo đèn lồng, 5 Đèn Lồng Lớn, Bóng Mực, Đom Đóm, HUD và nút Chơi lại.
  - Tính năng sáng tạo (**Chuông gió ngũ cung Web Audio** + **Tinh linh Hoa Đăng dẫn đường**) hoạt động ở client và **không làm thay đổi bất kỳ byte nào** của đầu ra headless.
- **Điểm cần lưu ý cho Phase 2:** Sẵn sàng mở rộng `GameSimulation` khi Ticket-02 bổ sung cơ chế hoặc màn chơi mới mà vẫn giữ nguyên tương thích ngược cho Đêm 1.
