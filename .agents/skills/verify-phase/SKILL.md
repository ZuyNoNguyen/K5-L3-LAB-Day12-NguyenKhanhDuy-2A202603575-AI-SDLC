---
name: verify-phase
description: Quy trình tự động kiểm chứng Test Contract, kiểm tra tính tất định (determinism), chạy unit tests và lưu bằng chứng thật cho từng Phase của Đảo Đèn Lồng.
---

# Skill: Verify Phase & Generate Proof

Sử dụng skill này trước khi kết thúc mỗi Phase hoặc trước mỗi lần gắn tag `phase-N`.

## Các bước thực hiện
1. **Chạy bộ kiểm thử tự động & sinh bằng chứng:**
   ```bash
   npm run verify
   ```
2. **Kiểm tra các hạng mục bắt buộc trong output:**
   - Mọi unit test và scenario test phải `PASS`.
   - Kiểm tra tính tất định (Determinism check): 2 lần chạy cùng `--seed`, `--scenario`, `--inputs` phải khớp hash SHA-256 tuyệt đối.
   - Kiểm tra mã thoát `2` khi truyền file `inputs` hoặc `scenario` sai quy ước (ví dụ `tick` giảm hoặc trùng).
   - Kiểm tra các file bằng chứng `.jsonl` và báo cáo đã được ghi vào `docs/proof/phaseN/`.
3. **Đánh giá độc lập (Independent Review):**
   - Gọi subagent `research` đóng vai trò **Independent QA Reviewer** đọc `docs/proof/phaseN/` và `game.contract.json` để xác nhận bằng chứng khớp với mã nguồn và yêu cầu của Phase.
