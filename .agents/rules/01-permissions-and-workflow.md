# 01. Quyền Hạn và Luồng Làm Việc Của AI (Mức Độ Ưu Tiên Tuyệt Đối)

<CRITICAL_CONSTRAINTS>
1. KHÔNG BAO GIỜ tự ý thay đổi hệ thống (ghi/sửa/xóa file, chạy script, commit git, ghi database...) khi CHƯA CÓ sự đồng ý bằng văn bản rõ ràng từ User.
2. Khi User dùng các từ như "xem", "kiểm tra", "phân tích", "rà soát", AI CHỈ ĐƯỢC PHÉP dùng thao tác ĐỌC. tuyệt đối không được coi đó là quyền sửa file.
3. PHẢI CÓ QUY TRÌNH KIỂM TRA TRƯỚC KHI THỰC THI (PRE-FLIGHT CHECK). Bạn bị CẤM GỌI CÔNG CỤ (tool) sửa đổi nếu chưa in ra màn hình checklist này và chờ phê duyệt.
</CRITICAL_CONSTRAINTS>

## 🛑 BẮT BUỘC IN RA PRE-FLIGHT CHECKLIST
Trước khi xin phép User để thực thi bất kỳ thay đổi nào, bạn PHẢI in ra checklist sau trong câu trả lời:

```markdown
### 🛑 [PRE-FLIGHT CHECK & ĐỀ XUẤT THAY ĐỔI]
- **Vấn đề / Nguyên nhân gốc**: [Mô tả chi tiết nguyên nhân gốc đã xác minh]
- **Phương án đề xuất**: [Các bước sẽ làm]
- **Các file dự kiến tác động**: [Liệt kê đường dẫn file]
- **Rủi ro (Side effects) có thể xảy ra**: [Nêu rõ ảnh hưởng tới các module khác/cache/db/event]
- **Kế hoạch kiểm thử (Testing)**: [Các bài test sẽ chạy]
👉 **Xin phép User**: "Bạn có đồng ý với phương án và phạm vi thay đổi trên không?"
```

Chỉ sau khi User trả lời xác nhận (vd: "Đồng ý", "Ok", "Thực hiện đi"), bạn mới được phép bắt đầu gọi các tool để sửa file hoặc thực thi lệnh thay đổi.

---

## 📋 Mẫu Quy Trình Làm Việc Bắt Buộc Dành Cho AI (5 Giai Đoạn)

1. **Giai đoạn 1: Tiếp nhận**: Xác định phạm vi (đọc hay sửa). Nếu yêu cầu mơ hồ, hỏi lại ngay.
2. **Giai đoạn 2: Phân tích chỉ đọc**:
   - Đọc Knowledge Graph / Codebase Memory.
   - Đọc file & symbol liên quan. Truy vết caller/callee.
   - Tìm nguyên nhân gốc.
3. **Giai đoạn 3: Đề xuất (Pre-Flight Check)**: Trình bày nguyên nhân, giải pháp, rủi ro và CHỜ DUYỆT.
4. **Giai đoạn 4: Thực hiện**:
   - Chỉ thay đổi trong đúng phạm vi đã được duyệt.
   - Sửa trực tiếp implementation chính, không tạo wrapper che lỗi.
   - Nếu phát sinh vấn đề mới ngoài phạm vi -> DỪNG LẠI và xin phép lại.
5. **Giai đoạn 5: Xác minh & Bàn giao**: Chạy test, kiểm tra side-effect, kiểm tra git diff xem có file rác không và báo cáo kết quả.

---

## 🎯 Definition of Done (Tiêu Chuẩn Hoàn Thành Bắt Buộc)
Một thay đổi CHỈ ĐƯỢC XEM LÀ HOÀN THÀNH khi:
1. Đã kiểm tra Codebase Memory/Knowledge Graph trước khi sửa.
2. Đã xử lý NGUYÊN NHÂN GỐC, không sửa triệu chứng ở ngoài.
3. Không tạo implementation song song (v2, temp, fix_old...).
4. Đã chạy `code-reuse-auditor` nếu tạo/mở rộng logic.
5. Đã đánh giá side-effect (Cache, Event Bus, DB, API contract).
6. Thay đổi nằm ĐÚNG PHẠM VI User đã phê duyệt.
7. Test nằm duy nhất trong thư mục `tests/` và đã chạy thành công.
8. Không có code chết, import thừa, file tạm hoặc code bị comment-out.
9. Không làm mất hoặc ghi đè thay đổi chưa commit của User.
