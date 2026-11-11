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
- Nén sản phẩm tối đa 1,8%, lún dọc và bè ngang nhẹ: 0,12 giây; giữ lực thêm 0,10 giây.
- Ngay lúc tiếp xúc: 22 cụm khói trắng bốc quanh mép khuôn, kèm tiếng xì nhẹ; không đợi nhấc mới phát khói.
- Nhấc khuôn: 0,28 giây, chậm trước nhanh sau; các mảnh hồi mềm lệch nhau 55 ms, hơi nén/bè và nghiêng rồi trở về đúng hình.
- Ổn định: 0,65 giây. Chi tiết nhấn ba nhịp nhỏ cách 0,13 giây (nảy/lắc nhẹ, hạt sáng và nốt leo), sau đó hiện nhãn hoàn thành và hợp âm.

Màu, bóng và toàn bộ trang trí hoàn thiện ngay khi khuôn chạm xuống. Nhấc khuôn chỉ để lộ kết quả, các nhịp nhấn không tạo thêm chi tiết mới. Bóng khuôn thay đổi theo độ cao, tách biệt với bóng giữa các mảnh. Giữ khói để thể hiện dập giấy vào khuôn; không lan màu sau khi nhấc, không có vòng trắng, chớp trắng hay rung cả màn. Giảm chuyển động: giữ 8 cụm khói chậm, bỏ nén/hồi, lắc/nảy, hạt sáng và vệt sáng; giữ nhịp âm thanh.

## Kiểm tra

```sh
node Prototype/web-demo/smoke2.js
node Prototype/web-demo/smoke2.js --reduce-motion
node Prototype/web-demo/alt-solve.js
node Prototype/web-demo/bend-target.js
node Prototype/web-demo/check.js
```

Smoke test giải và ghép cả sáu sản phẩm; kiểm tra màu/chi tiết có sẵn khi ép, khói xuất hiện một lần đúng lúc tiếp xúc, giữ lực trước khi nhấc, ba nhịp nhấn và trở về trạng thái hoàn thành ổn định.

Các công cụ xuất sprite, âm thanh và fixture vẫn nằm trong thư mục này. Đồng bộ web không tự cập nhật code, nội dung hoặc fixture Unity; fixture hiện có của Unity vẫn là bộ 14 mảnh cũ.
