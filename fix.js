
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Please provide a file path.');
  process.exit(1);
}

const absolutePath = path.resolve(filePath);

fs.readFile(absolutePath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading file: ${err}`);
    process.exit(1);
  }

  let content = data;
  const replacements = {
    'Th+ng': 'Tháng',
    'Kh+ng X+c -+nh': 'Không Xác Định',
    'Kh+ng x+c -+nh': 'Không xác định',
    'Kh+ng th+ tߦi d+ li+u sߦn phߦm.': 'Không thể tải dữ liệu sản phẩm.',
    'L+i khi tߦi d+ li+u:': 'Lỗi khi tải dữ liệu:',
    'Kh+ng th+ tߦi d+ li+u product_price.': 'Không thể tải dữ liệu product_price.',
    'Kh+ng th+ tߦi gi+ nhߦp': 'Không thể tải giá nhập',
    'Nh? Cung C?p #': 'Nhà Cung Cấp #',
    'Kh+ng th+ tߦi gi+ nhߦp c+a NCC': 'Không thể tải giá nhập của NCC',
    'Kh+ng th+ tߦi danh s+ch ng+n h+ng.': 'Không thể tải danh sách ngân hàng.',
    'L+i khi tߦi danh s+ch ng+n h+ng:': 'Lỗi khi tải danh sách ngân hàng:',
    'Kh+ng th+ x+a sߦn phߦm.': 'Không thể xóa sản phẩm.',
    'Kh+ng th+ x+a sߦn phߦm. Vui l+ng th+ lߦi.': 'Không thể xóa sản phẩm. Vui lòng thử lại.',
    'Vui l+ng nhߦp gi+ h+p l+': 'Vui lòng nhập giá hợp lệ',
    'Gi+ nhߦp kh+ng -榦+c thߦp hn 0.': 'Giá nhập không được thấp hơn 0.',
    'Kh+ng th+ cߦp nhߦt gi+ nhߦp': 'Không thể cập nhật giá nhập',
    'Kh+ng th+ cߦp nhߦt gi+ nhߦp.': 'Không thể cập nhật giá nhập.',
    'Vui l+ng nhߦp t+n ngu+n h+p l+.': 'Vui lòng nhập tên nguồn hợp lệ.',
    'Gi+ nhߦp phߦi l+n hn 0.': 'Giá nhập phải lớn hơn 0.',
    'Kh+ng th+ th+m ngu+n m+i.': 'Không thể thêm nguồn mới.',
    'Kh+ng th+ x+a ngu+n n+y.': 'Không thể xóa nguồn này.',
    'Vui l+ng nhߦp m+ sߦn phߦm h+p l+': 'Vui lòng nhập mã sản phẩm hợp lệ',
    'T++ gi+ CTV phߦi l+n hn 0': 'Tỷ giá CTV phải lớn hơn 0',
    'T++ gi+ Kh+ch phߦi l+n hn 0': 'Tỷ giá Khách phải lớn hơn 0',
    'T? gi? khuy?n m?i kh?ng ???c ?m.': 'Tỷ giá khuyến mãi không được âm.',
    'T? gi? khuy?n m?i kh?ng ?p d?ng khi T? gi? Kh?ch ? 1.': 'Tỷ giá khuyến mãi không áp dụng khi Tỷ giá Khách là 1.',
    'T? gi? khuy?n m?i kh?ng ???c v??t': 'Tỷ giá khuyến mãi không được vượt',
    'Kh+ng th+ cߦp nhߦt gi+ sߦn phߦm': 'Không thể cập nhật giá sản phẩm',
    'L+i khi cߦp nhߦt gi+ sߦn phߦm:': 'Lỗi khi cập nhật giá sản phẩm:',
    'Vui l+ng nhߦp m+ sߦn phߦm': 'Vui lòng nhập mã sản phẩm',
    'T++ gi+ CTV phߦi l+n hn 0.': 'Tỷ giá CTV phải lớn hơn 0.',
    'T++ gi+ kh+ch phߦi l+n hn 0.': 'Tỷ giá khách phải lớn hơn 0.',
    'Kh+ng th+ tߦo sߦn phߦm': 'Không thể tạo sản phẩm',
    'L+i khi tߦo sߦn phߦm:': 'Lỗi khi tạo sản phẩm:',
    'L+i khi cߦp nhߦt trߦng th+i': 'Lỗi khi cập nhật trạng thái',
    'Cߦp nhߦt thߦt bߦi. Vui l+ng th+ lߦi': 'Cập nhật thất bại. Vui lòng thử lại',
    'T+ng Sߦn Phߦm': 'Tổng Sản Phẩm',
    '-ang Hoߦt -+ng': 'Đang Hoạt Động',
    'Tߦm D+ng': 'Tạm Dừng',
    'x+c -+nh X+a': 'Xác Định Xóa',
    'H+nh -+ng n+y sߦ+ X+a Sߦn Phߦm kh+i bߦng Gi+.': 'Hành động này sẽ Xóa Sản Phẩm khỏi Bảng Giá.',
    'Sߦn Phߦm #': 'Sản Phẩm #',
    'M+:': 'Mã:',
    'Bߦn c+ chߦc chߦn mu+n x+a sߦn phߦm n+y? H+nh -+ng kh+ng th+ ho+n t+c v+ d+ li+u li+n quan sߦ+ -榦+c cߦp nhߦt.': 'Bạn có chắc chắn muốn xóa sản phẩm này? Hành động không thể hoàn tác và dữ liệu liên quan sẽ được cập nhật.',
    'H+y': 'Hủy',
    '-ang X+a...': 'Đang Xóa...', 
    'X+a Sߦn Phߦm': 'Xóa Sản Phẩm',
    'Th+m Sߦn Phߦm m+i': 'Thêm Sản Phẩm mới',
    'Nhߦp Th+ng tin Sߦn Phߦm, Nh+ Cung Cߦp, T++ Gi+': 'Nhập Thông tin Sản Phẩm, Nhà Cung Cấp, Tỷ Giá',
    'Th+ng Tin Sߦn Phߦm': 'Thông Tin Sản Phẩm',
    'Sߦn Phߦm': 'Sản Phẩm',
    'G+i Sߦn Phߦm': 'Gói Sản Phẩm',
    'M+ Sߦn Phߦm': 'Mã Sản Phẩm',
    'T++ Gi+': 'Tỷ Giá',
    'T++ gi+ CTV': 'Tỷ giá CTV',
    'T++ gi+ Kh+ch': 'Tỷ giá Khách',
    'T++ gi+ Khuy?n M?i': 'Tỷ giá Khuyến Mãi',
    'Nh+ Cung Cߦp': 'Nhà Cung Cấp',
    'Th+m Nh+ Cung Cߦp': 'Thêm Nhà Cung Cấp',
    'T+n Nh+ Cung Cߦp': 'Tên Nhà Cung Cấp',
    'Gi+ Nhߦp': 'Giá Nhập',
    'Ch?n Ng+n H+ng': 'Chọn Ngân Hàng',
    '-ang tߦi...': 'Đang tải...', 
    'S? tߦi khoߦn': 'Số tài khoản',
    'L+u': 'Lưu',
    'Tߦo M+i': 'Tạo Mới',
    'Tߦo Sߦn Phߦm': 'Tạo Sản Phẩm',
    '-ang G+i...': 'Đang Gửi...', 
    'Nhߦp t+ kh+a tm ki?m...': 'Nhập từ khóa tìm kiếm...', 
    'Tߦt Cߦ': 'Tất Cả',
    'Hoߦt -+ng': 'Hoạt Động',
    'Kh+ng Hoߦt -+ng': 'Không Hoạt Động',
    'Tߦi Lߦi': 'Tải Lại',
    '-ang Tߦi Lߦi...': 'Đang Tải Lại...', 
    'Bߦng Gi+ Sߦn Phߦm': 'Bảng Giá Sản Phẩm',
    'Quߦn l+ gi+ sߦn phߦm, gi+ nhߦp, v+ c+c t++ l+.': 'Quản lý giá sản phẩm, giá nhập, và các tỷ lệ.',
    'Thao t+c': 'Thao tác',
    'Chi Ti?t': 'Chi Tiết',
    'S?a': 'Sửa',
    'L+u Thay -+i': 'Lưu Thay Đổi',
    'H+y': 'Hủy',
    '-ang L+u...': 'Đang Lưu...', 
    'Trߦng th+i': 'Trạng thái',
    'Hoߦt -+ng': 'Hoạt động',
    'D+ng': 'Dừng',
    'Cߦp nhߦt l+c': 'Cập nhật lúc',
    'Gi+ Nhߦp Thߦp Nhߦt': 'Giá Nhập Thấp Nhất',
    'Gi+ B+n': 'Giá Bán',
    'L+i Nhuߦn': 'Lợi Nhuận',
    'Gi+ S++': 'Giá Sỉ',
    'Gi+ L+': 'Giá Lẻ',
    'Gi+ KM': 'Giá KM',
    'Th+ng tin Th+m': 'Thông tin Thêm',
    'Sߦn phߦm ch+a c+ ngu+n cung cߦp n+o.': 'Sản phẩm chưa có nguồn cung cấp nào.',
    'Th+m Ngu+n': 'Thêm Nguồn',
    'T+n Ngu+n': 'Tên Nguồn',
    'Gi+': 'Giá',
    '-ang L+u...': 'Đang Lưu...', 
    'X+a': 'Xóa',
    'Kh+ng c+ d+ li+u': 'Không có dữ liệu',
    'Kh+ng tm thߦy k?t quߦ n+o': 'Không tìm thấy kết quả nào',
    'L+i tߦi d+ li+u': 'Lỗi tải dữ liệu'
  };

  for (const [key, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(key.replace(/\/g, '\\').replace(/[-\/\\^$*+?.()|[\\]{}]/g, '\$&'), 'g'), value);
  }

  console.log(content);
});
