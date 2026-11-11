# GraphNode web demo

Bản demo hiện có 6 sản phẩm, 17 mảnh. Theo yêu cầu khôi phục, `web/game.js` khôi phục bản v2 đã xuất bản trước các thử nghiệm (mốc `fb0e915` của nhánh gh-pages); không sửa v2 hay đồng bộ thêm nội dung level trong lần này. Các thử nghiệm hồi mềm, nhấn chi tiết và tô màu dưới khuôn đã được gỡ.

## Chạy

Từ thư mục gốc repository:

```sh
node Prototype/web-demo/web/server.js
```

Mở địa chỉ server in ra (mặc định `http://localhost:3000/`; tự tăng cổng nếu bận). Hai trang `index.html` và `cat-vai-nam.html` dùng chung `game.js`.

## Ép hoàn thiện

- Hạ khuôn: 0,20 giây.
- Dập: 0,10 giây, nén khuôn nhẹ, tiếng thịch, rung và chớp sáng như v2.
- Nhấc: 0,30 giây, khói quanh mép và tiếng xì như v2.
- Sau khi nhấc: màu loang từ tâm ra mép trong 0,60 giây, bóng hoàn thiện xuất hiện cùng vùng màu.
- Trang trí xuất hiện lần lượt cách 0,24 giây, kèm nốt nhạc và hạt sáng; sau cùng là hợp âm, confetti và nút tiếp tục.

Đây là khôi phục v2 nguyên trạng, gồm thời điểm phát khói khi nhấc. Ý tưởng tiếp theo chưa triển khai: cho bóng tiếp xúc giữa các mảnh xuất hiện ngay sau cú dập, trước khi màu loang; giữ màu loang và nhịp trang trí của v2. Nếu thử hướng này, bóng hoàn thiện không được vẽ lại theo mặt nạ loang để tránh bật bóng lần hai. Thời điểm khói khi dập sẽ chốt riêng cho biến thể mới.

## Kiểm tra

```sh
node Prototype/web-demo/smoke2.js
node Prototype/web-demo/alt-solve.js
node Prototype/web-demo/bend-target.js
node Prototype/web-demo/check.js
```

Smoke test dùng nguyên bản v2, giải và ghép cả sáu sản phẩm tới trạng thái hoàn thành. Các script khác kiểm tra lời giải xoay/soi gương và đích uốn dây.

Các công cụ xuất sprite, âm thanh và fixture vẫn nằm trong thư mục này. Đồng bộ web không tự cập nhật code, nội dung hoặc fixture Unity; fixture hiện có của Unity vẫn là bộ 14 mảnh cũ.
