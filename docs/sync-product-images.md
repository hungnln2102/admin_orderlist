# Đồng bộ ảnh sản phẩm lên VPS

Ảnh sản phẩm nằm trong `backend/image_product/` (bị gitignore nên không commit được).

## Khi deploy lần đầu hoặc thêm ảnh mới từ local

### Cách 1: SCP (khuyến nghị)

Từ máy local (nơi đã upload ảnh qua admin):

```bash
# Thay user và vps-ip bằng thông tin VPS của bạn
scp -r admin_orderlist/backend/image_product/* user@vps-ip:/path/to/admin_orderlist/backend/image_product/
```

### Cách 2: Rsync (có thể chạy nhiều lần để sync)

```bash
rsync -avz --progress admin_orderlist/backend/image_product/ user@vps-ip:/path/to/admin_orderlist/backend/image_product/
```

### Cách 3: Qua admin trên production

Đăng nhập admin tại https://admin.mavrykpremium.store và upload lại ảnh cho từng sản phẩm.

---

## Lưu ý

- Đường dẫn trên VPS phải đúng: `admin_orderlist/backend/image_product/`
- Sau khi copy, restart backend: `docker compose restart backend` (trong thư mục admin_orderlist)
- Kiểm tra: `ls -la backend/image_product/` trên VPS
