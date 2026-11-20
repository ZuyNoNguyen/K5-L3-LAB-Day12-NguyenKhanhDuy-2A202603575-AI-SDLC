# Bằng chứng Kiểm chứng Phase 1 (Verification Proof Report)

- **Node.js Runtime:** `v22.18.0` (`win32 / x64`)
- **Trạng thái tổng thể:** **100% PASS (8/8 AC)**

## 1. Bảng Truy vết Yêu cầu đến Bằng chứng (Traceability Matrix)

| Mã AC | Yêu cầu (PRD-0 & Contract v1.0) | Kịch bản & File Đầu vào | File Output Bằng chứng | Kết quả | Chi tiết Kiểm chứng |
|---|---|---|---|---|---|
| **AC-1.1** | Validate game.contract.json schema & tuning fields | `game.contract.json` | `game.contract.json` | **PASS** | contract_version=1.0, team=2A202603575-NguyenKhanhDuy |
| **AC-1.2** | Verify cam_yaw_deg movement transformation & mote_picked event | `scenarios/sc_pickup_yaw.json`, `in_pickup_yaw.json` | `outputs/out_pickup_yaw.jsonl` | **PASS** | Picked 2 motes at ticks 12, 35; final score=20 |
| **AC-1.3** | Verify interact deposit, lantern_lit, and game_over (won / all_lit) | `scenarios/sc_win_all_lit.json`, `in_win_all_lit.json` | `outputs/out_win_all_lit.jsonl` | **PASS** | Lit L1 at tick 6, game_over=won(all_lit), score=845 |
| **AC-1.4** | Verify pulse event stuns and pushes shades back | `scenarios/sc_pulse_stun.json`, `in_pulse_stun.json` | `outputs/out_pulse_stun.jsonl` | **PASS** | Pulse stunned S1, pushed from z=3.0 to z=7 |
| **AC-1.5** | Verify player_hit event, mote drop ratio, and game_over (lost / no_flames) | `scenarios/sc_hit_lose.json` | `outputs/out_hit_lose.jsonl` | **PASS** | Hit at tick 1: flames=0, dropped=2 -> game_over=lost(no_flames) |
| **AC-1.6** | Verify safe_radius around lit lantern & game_over (lost / dawn) | `scenarios/sc_safe_dawn.json` | `outputs/out_safe_dawn.jsonl` | **PASS** | 0 hits inside safe_radius=5m; dawn triggered at tick 60 |
| **AC-1.7** | Verify 100% byte-for-byte determinism & exit code 2 on malformed inputs | `scenarios/in_determinism.json`, `in_invalid_order.json` | `outputs/out_det_run1.jsonl`, `out_det_run2.jsonl` | **PASS** | SHA-256=7fee1243f31fd512... matched 100%; invalid input exit_code=2 |
| **AC-1.8** | Verify 3D Client assets & strict isolation of creative features from headless core | `src/client/index.html`, `src/client/main.mjs` | `src/core/sim.mjs` (Static Isolation Check) | **PASS** | Core is 100% DOM/Math.random-free; 3D client & 2 creative features verified |

## 2. Lệnh Tái lập Bằng chứng (Reproducibility)

Giảng viên có thể chạy lại toàn bộ bộ kiểm chứng này ở tag `phase-1` bằng một lệnh duy nhất:
```bash
npm run verify
```
