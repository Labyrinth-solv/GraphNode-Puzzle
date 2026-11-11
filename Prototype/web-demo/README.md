# GraphNode web demo

Bản demo hiện có 6 sản phẩm, 17 mảnh. Màu sắc, hình mảnh và trang trí lấy từ `Prototype/web-v2`; bản v2 được giữ nguyên. Riêng nhịp ép hoàn thiện bên dưới được chỉnh độc lập trong web-demo theo yêu cầu ngày 2026-11-11.

## Chạy

Từ thư mục gốc repository:

```sh
node Prototype/web-demo/web/server.js
```

Mở địa chỉ server in ra (mặc định `http://localhost:3000/`; tự tăng cổng nếu bận). Hai trang `index.html` và `cat-vai-nam.html` dùng chung `game.js`.

## Ép hoàn thiện

- Hạ khuôn: 0,18 giây.
- Nén sản phẩm tối đa 1,8%: 0,12 giây; giữ lực thêm 0,10 giây.
- Nhấc khuôn: 0,28 giây, chậm trước nhanh sau, sản phẩm hồi nhẹ một lần.
- Ổn định: 0,15 giây, sau đó hiện nhãn hoàn thành và hợp âm.

Màu, bóng và toàn bộ trang trí hoàn thiện ngay khi khuôn chạm xuống. Nhấc khuôn chỉ để lộ kết quả. Bóng khuôn thay đổi theo độ cao, tách biệt với bóng giữa các mảnh. Bỏ lan màu sau khi nhấc, vòng trắng, hơi nước, chớp trắng và rung cả màn; giữ gợn ép mảnh và ánh sáng nhẹ. Tôn trọng thiết lập giảm chuyển động của trình duyệt.

## Kiểm tra

```sh
node Prototype/web-demo/smoke2.js
node Prototype/web-demo/smoke2.js --reduce-motion
node Prototype/web-demo/alt-solve.js
node Prototype/web-demo/bend-target.js
node Prototype/web-demo/check.js
```

Smoke test giải và ghép cả sáu sản phẩm; kiểm tra màu/chi tiết có sẵn khi ép, giữ lực trước khi nhấc, không phun hơi nước và trở về trạng thái hoàn thành ổn định.

Các công cụ xuất sprite, âm thanh và fixture vẫn nằm trong thư mục này. Đồng bộ web không tự cập nhật code, nội dung hoặc fixture Unity; fixture hiện có của Unity vẫn là bộ 14 mảnh cũ.
