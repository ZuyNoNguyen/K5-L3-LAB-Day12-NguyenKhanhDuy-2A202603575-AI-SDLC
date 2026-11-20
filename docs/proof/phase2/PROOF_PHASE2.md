# Bằng chứng Kiểm chứng Phase 2 (Verification Proof Report · Contract v1.1)

- **Node.js Runtime:** `v22.18.0` (`win32 / x64`)
- **Trạng thái tổng thể:** **100% PASS (8/8 AC)**

## 1. Bảng Truy vết Yêu cầu đến Bằng chứng (Traceability Matrix)

| Mã AC | Yêu cầu (Ticket-02 & Contract v1.1) | Kịch bản & File Đầu vào | File Output Bằng chứng | Kết quả | Chi tiết Kiểm chứng |
|---|---|---|---|---|---|
| **AC-2.1** | Validate Contract v1.1 schema, tuning & Night 1 Regression (interact deposit, pulse cost=3, lantern_cost=10) | `game.contract.json`, `scenarios/sc_regress_night1.json` | `outputs/out_regress_night1.jsonl` | **PASS** (132.73ms) | Deposit 10 motes, lit L1, won at tick 3, score=548 |
| **AC-2.2** | Verify Dash event (14m/s) & Fall into mist (Y < -10, player_hit by fall, lost motes, 60-tick respawn) | `scenarios/sc_dash_fall.json`, `in_dash_fall.json` | `outputs/out_dash_fall.jsonl` | **PASS** (125.71ms) | Dash at tick 1, fell at tick 71 (-1 flame, lost 5 motes), respawned at (0,0,0) |
| **AC-2.3** | Verify Night 2 (Đảo Cau) layout, bamboo bridge walking & jump pad to Island B | `scenarios/sc_night2_jumppad.json`, `in_night2_jumppad.json` | `outputs/out_night2_jumppad.jsonl` | **PASS** (129.53ms) | Launched via JP1 to apex Y=3.378, landed on Island B at x=50.337 |
| **AC-2.4** | Verify Night 3 (Đảo Chuông) 3-tier elevation, ramp ascending & wind push | `scenarios/sc_night3_tiers.json`, `in_night3_tiers.json` | `outputs/out_night3_tiers.jsonl` | **PASS** (139.43ms) | Ascended 30-deg ramp from Y=0 to Y=2.992 on Tier 1 |
| **AC-2.5** | Verify Drifter (Gió Lạc) mechanics: chase -> steal -> flee -> pulse drops motes | `scenarios/sc_drifter_steal_drop.json`, `in_drifter_steal_drop.json` | `outputs/out_drifter_steal_drop.jsonl` | **PASS** (147.53ms) | Drifter D1 stole 3 motes, pulse hit caused drifter_drop of 3 motes |
| **AC-2.6** | Verify Wind Charm (Bùa Gió): charm_picked, speed increase, and zero dash cooldown | `scenarios/sc_charm_boost.json`, `in_charm_boost.json` | `outputs/out_charm_boost.jsonl` | **PASS** (135.14ms) | Picked C1, executed 2 successive dashes without cooldown penalty |
| **AC-2.7** | Verify Pause input & snapshot status: pauses gameplay while clock holds | `scenarios/in_pause_toggle.json` | `outputs/out_pause_toggle.jsonl` | **PASS** (140.84ms) | Pause at tick 6, state="paused", resumed at tick 16 |
| **AC-2.8** | Performance Benchmark (21,600 ticks <= 30s) & 100% Determinism | `--night 3 --ticks 21600` | `outputs/out_bench_21k_run1.jsonl` | **PASS** (5814.30ms) | 21,600 ticks executed in 2.95s (Benchmark limit: 30s); SHA-256 matched |

## 2. Lệnh Tái lập Bằng chứng (Reproducibility)
```bash
npm run verify
```
