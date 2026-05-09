---
name: agents-unified
description: Trung tâm hợp nhất tri thức giữa .agents và .cursor cho admin_orderlist. Dùng khi cần một đầu mối duy nhất để áp dụng workflow, standards và domain skills.
disable-model-invocation: true
---

# Agents Unified

## Mục đích

Skill này hợp nhất cách dùng `.agents` và `.cursor` theo mô hình:

- `.agents`: nguồn sự thật về kiến thức chuyên môn và workflow.
- `.cursor`: đầu mối điều phối, auto-apply và quản lý rule.

## Cách dùng

1. Đọc nhanh nền tảng dự án: `.agents/SKILL.md`.
2. Chọn domain và workflow phù hợp:
   - Software engineering: `.agents/software-engineering/AGENTS.md`
   - Marketing SEO: `.agents/marketing-seo/AGENTS.md`
   - Ecommerce: `.agents/ecommerce/AGENTS.md`
3. Nạp skill chuyên sâu khi cần:
   - ACID DB review: `.agents/software-engineering/skills/acid-database-transaction-review/SKILL.md`
   - DB schema source-of-truth: `.agents/software-engineering/skills/db-schema-source-of-truth/SKILL.md`
   - Task tracking: `.agents/software-engineering/skills/task-tracking/SKILL.md`
   - Vietnamese diacritics: `.agents/software-engineering/skills/vietnamese-diacritics/SKILL.md`
4. Khi làm task code:
   - Ưu tiên thay đổi nhỏ, kiểm chứng được.
   - Bám chuẩn schema constants và status constants.
   - Kiểm tra tính idempotent cho webhook/job.

## Chính sách hợp nhất

- Không duplicate toàn bộ file từ `.agents` sang `.cursor`.
- Nếu cần sửa nội dung chuyên môn, sửa tại `.agents` trước.
- `.cursor` chỉ giữ lớp bridge, index và rule auto-apply.
