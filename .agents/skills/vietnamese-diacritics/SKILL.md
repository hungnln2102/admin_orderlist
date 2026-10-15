---
name: Vietnamese Diacritics
description: Always write user-facing Vietnamese with full diacritics in this repo. Use when replying in Vietnamese, writing task trackers, markdown docs, notes, comments for humans, or any internal documentation that should be easy for Vietnamese readers to understand.
---

# Vietnamese Diacritics Skill

## Mục tiêu

Đảm bảo mọi nội dung tiếng Việt hướng tới con người trong repo này đều có dấu đầy đủ, dễ đọc và đúng ngữ nghĩa.

## Khi nào dùng

Dùng skill này khi:

- Người dùng đang trao đổi bằng tiếng Việt.
- Cần viết hoặc cập nhật `*.md`, ghi chú, task tracker, hướng dẫn nội bộ bằng tiếng Việt.
- Cần viết phần mô tả, checklist, trạng thái công việc, giải thích kỹ thuật bằng tiếng Việt.
- Cần rà soát nội dung đã viết bị mất dấu, sai dấu hoặc khó đọc.

## Quy tắc bắt buộc

1. Luôn dùng tiếng Việt có dấu cho mọi nội dung hướng tới người đọc:
   - phản hồi cho người dùng
   - file markdown
   - ghi chú nội bộ
   - checklist
   - mô tả task
   - comment giải thích cho con người nếu comment đó viết bằng tiếng Việt

2. Không viết tiếng Việt không dấu, trừ các trường hợp bắt buộc phải giữ nguyên:
   - mã nguồn
   - tên biến
   - tên hàm
   - key JSON
   - env var
   - command
   - đường dẫn
   - identifier kỹ thuật
   - dữ liệu đầu vào phải giữ nguyên theo hệ thống khác

3. Nếu một đoạn tiếng Việt đang ở dạng không dấu hoặc bị lỗi encoding, ưu tiên chuẩn hóa lại ngay khi chỉnh sửa file đó.

4. Khi viết tài liệu tiếng Việt:
   - ưu tiên câu ngắn, rõ nghĩa
   - tiêu đề và checklist phải dễ quét
   - tránh pha tiếng Anh không cần thiết
   - chỉ giữ thuật ngữ tiếng Anh khi đó là thuật ngữ kỹ thuật chuẩn

5. Nếu nội dung vừa có phần kỹ thuật vừa có phần giải thích:
   - giữ nguyên phần kỹ thuật ở dạng ASCII khi cần
   - phần mô tả xung quanh phải là tiếng Việt có dấu

## Cách áp dụng

Trước khi kết thúc một thay đổi có text tiếng Việt, tự kiểm tra nhanh:

- Có đoạn nào đang viết không dấu không?
- Có tiêu đề hoặc bullet nào khó đọc vì thiếu dấu không?
- Có chỗ nào bị lỗi mã hóa kiểu ký tự vỡ chữ không?
- Có chỗ nào đang lẫn giữa text cho con người và text kỹ thuật mà chưa tách rõ không?

Nếu có, sửa ngay trong cùng thay đổi đó.

## Ví dụ

Không đạt:

```markdown
## Da hoan thanh
- [x] Chot kien truc SEO
- [ ] Kiem tra runtime
```

Đạt:

```markdown
## Đã hoàn thành
- [x] Chốt kiến trúc SEO
- [ ] Kiểm tra runtime
```

## Ưu tiên trong repo này

Trong `admin_orderlist`, ưu tiên áp dụng skill này cho:

- `docs/`
- file task status
- workflow notes
- hướng dẫn vận hành
- phản hồi cho người dùng bằng tiếng Việt

Không ép chuyển sang có dấu với:

- giá trị `.env`
- API payload keys
- code literals cần tương thích hệ thống
- log/message kỹ thuật cần giữ nguyên để match với code khác
