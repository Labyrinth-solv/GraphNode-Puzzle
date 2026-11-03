# Plan phát triển: Game cắt vải theo hình mẫu

Nov 2, 2026 · @Duc

## Tổng quan

Bản prototype đầu tiên chỉ kiểm chứng một vòng chơi: kéo điểm của graph để viền ngoài khớp hình mẫu, thanh khớp đạt ngưỡng thì màn tự hoàn thành. Câu hỏi cần trả lời: người chơi có tự muốn chơi tiếp sau 15–20 màn không.

**Mục đích tài liệu:** đây là đặc tả đầu vào để làm bản cuối trên Unity chuẩn production. Bản thử web chỉ dùng để kiểm chứng luật và cảm giác; mục "Chuẩn production trên Unity" ghi các yêu cầu kỹ thuật, hiệu năng, kiểm thử và phát hành.

**Bản gốc của tài liệu:** file `Assets/Docs/GraphNode-Puzzle-Dac-ta.md` này trong repo của project. Bản trên Claude Docs dùng để đọc và bình luận; khi hai bản khác nhau thì bản trong repo đúng.

- **Nền tảng:** Unity 2D, mobile màn hình dọc (iOS, Android), thao tác một ngón tay.
- **Trong phạm vi:** 2 loại điểm (thẳng, cong), node bị khóa, luật viền ngoài, thanh khớp, auto-snap và animation hoàn thành, mảnh vải ghép vào sản phẩm, khoảng 20 màn, lưu tiến trình trên máy, màn Home tiệm may với khách ở quầy và bong bóng suy nghĩ.
- **Ngoài phạm vi:** các lớp meta mở rộng (xem mục Meta loop: tiệm may), quảng cáo, IAP, sự kiện, các loại điểm và cạnh mới.
- **Chỉ số đề xuất khi test:** hơn 90% người thử qua màn 1–10 không cần hướng dẫn thêm; mỗi màn trung bình 30–90 giây; phần lớn người thử tự chơi quá màn 15.

## Core gameplay loop

Mỗi màn là một vòng kéo điểm và xem thanh khớp; không có nút Cắt và không có thua, chỉ có chưa xong.

1. **Vào màn:** hình mẫu hiện thành bóng mờ trên vải và thẻ nhỏ phía trên. Graph ở trạng thái xáo trộn, thanh khớp khoảng 30–60%.
2. **Kéo điểm:** viền ngoài (đường cắt) cập nhật trực tiếp, thanh khớp tăng giảm theo.
3. **Đạt ngưỡng:** ngay khi thanh đạt ngưỡng, kể cả lúc đang kéo, thao tác bị khóa, các điểm mờ đi và điểm sáng chạy kiểm tra: nó phải đi qua mọi điểm và mọi ghim, rồi mới chuyển sang bước 4. Bảng thắng chỉ hiện sau cảnh cắt và ghép. Chưa đạt thì tiếp tục kéo; có nút Gợi ý và Đặt lại.
4. **Auto-snap:** khóa thao tác, đường cắt biến về đúng đường viền hình mẫu.
5. **Cắt:** kéo chạy dọc viền, miếng vải nhấc lên, đổ màu hoặc hoa văn.
6. **Ghép vào sản phẩm:** mảnh vải bay vào sản phẩm đang may dở. Đủ mảnh thì chạy màn lộ diện sản phẩm.
7. **Màn kế tiếp:** tự chuyển sau khoảng 0,5 giây, hoặc chạm để chuyển ngay.

## Cơ chế chi tiết

Người chơi chỉ di chuyển điểm; số điểm, số cạnh và cách nối cố định theo level. Phần giải đố nằm ở chỗ tìm bố cục để đường bao ngoài thành hình mẫu.

### Graph

- **Điểm (node):** vị trí, loại (thẳng hoặc cong). Kéo được trong phạm vi tấm vải, không ra ngoài mép, trừ node bị khóa.
- **Cạnh (edge):** nối hai điểm, cố định. Cạnh được phép cắt chéo nhau.
- **Hình dạng cạnh:** nối hai điểm cong là đường cong Catmull-Rom đi qua đúng các điểm. Có ít nhất một đầu là điểm thẳng thì là đoạn thẳng. Mỗi cạnh lấy mẫu 16–24 điểm thành đường gấp khúc.

### Node bị khóa

Node bị khóa đứng yên suốt màn; người chơi phải sắp xếp các node còn lại quanh nó để viền ngoài thành hình mẫu.

- **Luật:** không kéo được nhưng vẫn là một phần của graph. Các cạnh nối vào nó vẫn thẳng hoặc cong theo loại của nó, và nó có thể nằm trên viền ngoài hoặc bên trong.
- **Hiển thị:** giữ hình vuông hoặc tròn theo loại, thêm ghim kim may và viền xám. Chạm vào thì node lắc tại chỗ và rung nhẹ để báo không kéo được.
- **Vai trò giải đố:** cố định một phần lời giải nên thu hẹp số cách sắp xếp, buộc người chơi suy luận các node khác phải đi đâu. Node khóa đặt ở chỗ trái trực giác, ví dụ nằm sâu trong lòng hình, tạo ra màn "aha".
- **Auto-snap:** như mọi màn, đường cắt biến về viền hình mẫu; node khóa mờ đi cùng các node khác.
- **Thiết kế level:** lời giải phải hợp lệ khi node khóa giữ nguyên chỗ. Công cụ tối ưu lời giải và xáo trộn bỏ qua node khóa.

### Viền ngoài (đường cắt)

Viền ngoài là biên của mặt ngoài cùng khi graph được phẳng hóa. Vùng bên trong nó là miếng vải nhận được.

1. Tìm giao điểm giữa các đoạn gấp khúc và tách cạnh tại đó.
2. Bắt đầu từ đỉnh thấp nhất (rồi trái nhất), luôn rẽ theo hướng ngoài cùng cho tới khi quay về điểm đầu.
3. Kết quả là một đa giác khép kín, dùng để vẽ đường cắt, tính điểm khớp và dựng miếng vải.

Với khoảng 10 điểm và 400 đoạn, kiểm tra giao điểm từng cặp vẫn nhẹ. Nếu chậm trên máy yếu, chia lưới không gian hoặc chỉ tính lại khi điểm di chuyển quá 2 px.

### Phần tô vùng cắt

Vùng bên trong viền ngoài được tô hồng nhạt khi kéo, để người chơi thấy ngay miếng vải đang nhận được. Đã chốt: giữ phần tô trong bản chính.

- Phần tô cho thấy chỗ thừa, chỗ thiếu so với bóng mờ hình mẫu, và phần nào của viền chéo nhau bị loại. Nó không chỉ ra điểm nào cần kéo hay kéo tới đâu; việc đó thuộc về nút Gợi ý.
- Cách tính: vẽ mọi cạnh lên mặt nạ 200×200, tô loang từ biên ngoài vào, phần không bị chạm tới là vùng bên trong. Cùng mặt nạ này cho ra điểm khớp.

### Thanh khớp

- **Điểm khớp:** tỷ lệ diện tích trùng nhau (giao chia hợp) giữa miếng vải và hình mẫu. Tính bằng thư viện đa giác Clipper2, hoặc vẽ hai mặt nạ 128×128 rồi đếm điểm ảnh.
- **Điều kiện phụ:** độ lệch viền lớn nhất không quá ngưỡng, để không thắng khi còn cụt mất mũi nhọn hay cuống lá.
- **Ngưỡng thắng:** mặc định 92%, chỉnh được theo từng level.
- **Hiển thị:** thanh không hiện thẳng phần trăm thô. Đoạn từ 50% đến ngưỡng được giãn ra cả thanh, nên mỗi lần kéo đều thấy thanh nhúc nhích rõ. Thanh trượt mượt về giá trị mới, đổi màu theo mốc và rung nhẹ khi qua 70%, 85%.
- **Tần suất tính:** khi đang kéo, 2–3 khung hình một lần.
- **Khi nào thắng:** ngay khi thanh đạt ngưỡng, kể cả lúc đang kéo. Thao tác khóa ngay, node đang giữ được nhả khỏi ngón tay, rồi chạy vòng kiểm tra điểm và ghim, sau đó mới chạy chuỗi hoàn thành và hiện bảng thắng. Để tránh thắng do lướt qua ngưỡng một thoáng, có thể yêu cầu điểm giữ trên ngưỡng khoảng 0,1 giây.

### Auto-snap và chuỗi hoàn thành

Khi thắng, đường cắt biến hình về đúng đường viền hình mẫu: mỗi điểm mẫu trên đường cắt trượt tới điểm gần nhất trên viền hình mẫu. Các node và cạnh bên trong mờ dần. Cách này đúng với mọi lời giải người chơi tìm ra, không phụ thuộc một lời giải lưu sẵn.

| Bước | Thời lượng | Diễn ra |
| --- | --- | --- |
| Snap | 0,3 s | Khóa thao tác, đường cắt biến về viền hình mẫu, node mờ đi |
| Cắt | 1,2 s | Kéo chạy dọc viền, phần đã cắt thành nét liền |
| Nhấc lên | 0,4 s | Miếng vải nảy lên, đổ bóng, để lại lỗ trên vải |
| Đổ màu | 0,6 s | Màu hoặc hoa văn chạy từ dưới lên, hiện đường chỉ khâu |
| Ghép | 0,6 s | Mảnh bay vào sản phẩm, thanh tiến độ sản phẩm tăng |

Tổng khoảng 3 giây; chạm màn hình để tua nhanh.

### Điểm chạy dọc viền và nốt nhạc

Một điểm vàng có đuôi sáng chạy theo vòng các node, vừa để bắt mắt, vừa cho người chơi thấy node nào đang nằm trên viền ngoài.

- **Chuyển động:** tốc độ không đổi 250 px mỗi giây (khung vải 368 px), kể cả khi người chơi đang kéo. Điểm gắn với một cạnh và một vị trí tỷ lệ trên cạnh đó, nên khi node bị kéo làm cạnh dài ra hay co lại, điểm đi theo cạnh liên tục. Cách đầu tiên tính theo tỷ lệ cả vòng làm điểm nhảy giật mỗi khi chu vi đổi, đã bỏ.
- **Nốt nhạc:** khi điểm tới một node nằm trên viền ngoài thì phát một nốt thang ngũ cung (đô, rê, mi, sol, la). Mỗi node một nốt cố định. Node nảy to 1,3 lần và có vòng sóng vàng lan ra trong 0,45 giây. Node nằm lọt trong vùng tô thì im lặng. Node được coi là trên viền nếu trong ô 7×7 của mặt nạ quanh nó có một ô nằm ngoài vùng.
- **Phản hồi theo độ khớp:** độ khớp thấp thì nốt nhỏ và lệch tông tối đa 30 cent, độ khớp cao thì đầy và đúng tông. Khi đang kéo, âm lượng giảm còn khoảng 45% để không lấn tiếng chạm node.
- **Cảnh cắt:** đầu kéo chạy dọc viền hình mẫu và phát một nốt ở mỗi node, thành một giai điệu ngắn.
- **Công tắc:** bật hoặc tắt trong phần thiết lập bản thử. Cần thử với người chơi xem có gây mệt khi nghĩ lâu không.

### Nét cắt đổi màu dọc viền

Nét phấn đứt của viền ngoài đổi màu liên tục quanh hình, trôi chậm, để viền bắt mắt hơn và báo hiệu sắp thắng.

- **Màu:** vòng màu chạy hồng, cam, vàng, xanh lá, xanh lam, tím theo góc quanh tâm vùng cắt, và trôi đều theo thời gian (khoảng 33° mỗi giây). Tắt chuyển động khi người dùng đặt giảm chuyển động.
- **Theo độ khớp:** từ khoảng 35% thanh khớp trở lên, các màu hòa dần về màu vàng phần thưởng; đầy thanh thì cả viền thành một màu vàng. Người chơi nhìn màu viền cũng biết đang gần hay xa.
- **Chi phí:** rất nhỏ, chỉ đổi cách vẽ nét đứt, không đổi cách tính điểm.

### Vòng kiểm tra điểm và ghim

Sau khi viền khớp hình, các điểm mờ đi và điểm sáng phải đi qua mọi điểm (thường và đặc biệt) cùng mọi ghim thì màn mới thắng, và bảng thắng chỉ hiện sau chuỗi hoàn thành. Màn không có ghim vẫn chạy vòng kiểm tra qua các điểm. Ghim là các điểm cố định trên viền hình mẫu.

- **Hai loại ghim:** ghim tròn rỗng, đi qua lúc nào cũng được; ghim có số (tam giác 1, vuông 2, ngũ giác 3, lục giác 4) phải đi qua theo thứ tự. Ghim số n chỉ sáng khi ghim số n−1 đã sáng; đi qua sai thứ tự thì ghim nhấp đỏ ngắn và không sáng.
- **Khi nào kiểm tra:** độ khớp đạt ngưỡng (giữ 0,1 giây) thì thao tác bị khóa, các điểm và cạnh mờ còn khoảng 30%, điểm sáng chạy một vòng từ node đầu của vòng với tốc độ 1,3 lần bình thường. Mỗi điểm mà điểm sáng đã đi qua sáng viền vàng; thanh khớp hiện "Kiểm tra n/N" (tổng điểm và ghim). Vì một vòng đi qua mọi node, chỉ ghim mới có thể làm kiểm tra thất bại. Ghim nào được đi qua đúng thì chuyển vàng, có tiếng "ting" và rung nhẹ. Điểm và ghim sáng hết thì chuyển sang snap, cắt và ghép; bảng thắng hiện sau cùng, khi chuỗi hoàn thành kết thúc.
- **Tăng tốc ngắn:** mỗi lần điểm sáng đi qua một ghim, nó tăng tốc tới khoảng 2,4 lần rồi giảm dần trong khoảng 0,6 giây, đuôi sáng dài ra. Lúc đang chơi, ghim chỉ nhấp sáng khi điểm sáng qua, không tính điểm, để người chơi tự thấy viền đã đi qua ghim hay chưa.
- **Dung sai:** khoảng cách từ ghim tới đoạn đường điểm sáng đi trong một khung hình dưới 16 đơn vị. Vì khớp 92% cho phép lệch vài px, cần theo dõi xem dung sai này có khắt trên màn hình nhỏ không.
- **Thất bại:** điểm sáng chạy hết một vòng mà còn ghim chưa sáng thì màn trở lại chơi bình thường. Ghim còn trống nhấp đỏ, kèm lời nhắn (sai thứ tự, hay chưa đi qua đủ ghim). Màn chỉ tự kiểm tra lại sau khi người chơi kéo một node rồi thả.
- **Vị trí ghim:** đặt giữa cạnh, không đặt đúng chỗ node, để không bị node che. Dữ liệu level thêm danh sách `markers`, mỗi ghim gồm cạnh, tỷ lệ trên cạnh và loại. Thử nghiệm: cá 2 ghim tròn; nhà 3 ghim số; lá và tim mỗi màn 1 ghim tròn và 3 ghim số.

### Nút đảo chiều điểm sáng (đề xuất, chưa làm)

Vấn đề: chiều chạy của điểm sáng là chiều vòng node, người chơi không nhìn thấy. Với hình đối xứng (tim, nhà), người chơi có thể giải ra bản đối xứng gương, khớp gần 100% nhưng ghim số bị đi ngược, và phải làm lại cả bố cục.

- **Nút:** thêm nút "Đảo chiều" cạnh Gợi ý và Đặt lại. Bấm thì điểm sáng đổi chiều chạy (kim đồng hồ và ngược kim đồng hồ). Thứ tự ghim số được tính theo chiều đang chạy. Bấm được cả lúc đang chơi lẫn sau khi kiểm tra thất bại, không tính vào số lần kéo. Giữ phản hồi như bản thử: lời nhắn thất bại nói rõ đang đi chiều nào.
- **Hiển thị:** vài mũi tên mờ dọc viền chỉ chiều chạy hiện tại, đổi hướng khi bấm nút.
- **Điểm xuất phát:** bản thử cho điểm sáng xuất phát từ node đầu của vòng. Khi có nút đảo chiều, nên cho xuất phát gần ghim số 1 theo chiều đang chạy, để việc kiểm tra không phụ thuộc node nào là node đầu.
- **Hệ quả thiết kế cần biết:** với tối đa 3 ghim số, hai chiều chạy bao phủ cả hai thứ tự vòng có thể có của ba ghim, nên khi đã có nút đảo chiều miễn phí thì luật thứ tự gần như không còn gài buộc. Luật thứ tự chỉ còn ý nghĩa khi có từ 4 ghim số trở lên. Đề xuất: màn ít ghim cho đảo chiều miễn phí; màn từ 4 ghim số trở lên hoặc màn khó thì giới hạn 1 lần mỗi màn, hoặc tính như một lần Gợi ý. Cần thử với người chơi.

## Hệ thống level

Level là dữ liệu, không phải scene: một scene gameplay dùng chung tải mọi level, nên thêm màn không cần sửa code.

### Dữ liệu một level

| Trường | Kiểu | Ý nghĩa |
| --- | --- | --- |
| id, chapterId | string | Định danh và chương chứa màn |
| targetShape | danh sách điểm (0–1) | Đường viền hình mẫu, chuẩn hóa theo khung vải |
| nodes | id, startPos, solutionPos, type, locked | Vị trí ban đầu, một lời giải mẫu, loại thẳng hoặc cong, có bị khóa không |
| edges | cặp id node | Cách nối cố định |
| winThreshold | float | Ngưỡng khớp để thắng, mặc định 0,92 |
| maxDeviation | float | Độ lệch viền tối đa được phép |
| fabricId | string | Họa tiết vải của màn |
| productId, slotIndex | string, int | Mảnh này thuộc sản phẩm nào, ở vị trí nào |
| hintOrder | danh sách id node | Thứ tự node được gợi ý di chuyển |
| tags | danh sách | Cơ chế dùng trong màn, để mở rộng sau |

File JSON là bản gốc của level: Level Editor đọc và ghi thẳng JSON, game nạp JSON lúc chạy, test và CI kiểm tra đúng file đó. Không có bản ScriptableObject song song cho level. Thứ cần tham chiếu asset (khách, món đồ, vải, cấu hình) vẫn là ScriptableObject, level chỉ trỏ tới chúng bằng id.

### Tiến trình: chương, sản phẩm, màn

- Mỗi **sản phẩm** gồm 4–6 mảnh, tức 4–6 màn.
- Mỗi **chương** gồm 3–4 sản phẩm, khoảng 20 màn, và giới thiệu một ý tưởng mới.
- Prototype: chương 1 (điểm thẳng, điểm cong) và đầu chương 2 (node bị khóa, cạnh bên trong, cạnh cắt chéo).

### Độ khó

Các nút vặn độ khó: số node (3 đến 10), tỷ lệ điểm cong, số cạnh bên trong, số node bị khóa, độ xa giữa vị trí ban đầu và lời giải, độ phức tạp của hình mẫu, và ngưỡng thắng. Đường cong độ khó dạng răng cưa: cứ 4–5 màn có một màn "aha" khó hơn và một màn nghỉ dễ hơn.

Đề xuất 10 màn đầu:

| Màn | Hình mẫu | Node | Điểm cong | Mục đích |
| --- | --- | --- | --- | --- |
| 1 | Hình vuông | 4 | 0 | Học kéo điểm, xem thanh khớp |
| 2 | Tam giác | 3 | 0 | Củng cố thao tác |
| 3 | Ngôi nhà | 5 | 0 | Hình nhiều cạnh hơn |
| 4 | Hình tròn | 4 | 4 | Giới thiệu điểm cong |
| 5 | Giọt nước | 4 | 3 | Kết hợp thẳng và cong |
| 6 | Chiếc lá | 4 | 2 | Đỉnh nhọn ở hai đầu |
| 7 | Trái tim | 8 | 6 | Màn khó đầu tiên |
| 8 | Đám mây | 6 | 6 | Màn nghỉ |
| 9 | Ngôi sao | 10 | 0 | Nhiều điểm nhưng chỉ có đoạn thẳng |
| 10 | Con cá | 7 | 4 | Màn "aha" đầu tiên, có một cạnh bên trong |

### Công cụ tạo level (Level Editor trong Unity)

- **Nhập hình mẫu:** từ đường path SVG, hoặc vẽ tay rồi làm mượt.
- **Dựng graph:** đặt node, nối cạnh, chọn loại điểm, đánh dấu node khóa, kéo node vào vị trí lời giải.
- **Tối ưu lời giải:** nút tự dịch node từng chút để điểm khớp cao nhất. Thử nghiệm trước đó: trái tim 8 node đạt khoảng 97%.
- **Xáo trộn:** tạo vị trí ban đầu ngẫu nhiên có ràng buộc: điểm khớp ban đầu 30–60%, các node không chồng lên nhau.
- **Kiểm tra hàng loạt:** mọi level có lời giải vượt ngưỡng, vị trí ban đầu chưa vượt ngưỡng.

### Level chiều sâu (cho Level Editor)

Một số level sẽ có hình ảnh "đi vào trong": tranh có chiều sâu, điểm sáng như đi vào xa. Đây là lớp hình ảnh phủ lên một màn chơi vẫn là 2D, nhằm làm level đẹp và thú vị hơn. Level Editor phải hỗ trợ loại level này ngay từ đầu, vì dữ liệu cần thêm trường riêng.

- **Nguyên tắc:** logic chơi nằm trên một mặt phẳng 2D. Đồ thị, mặt nạ vùng tô, điểm khớp, ghim, vùng cấm đều tính trên mặt phẳng gốc, không tính trên hình đã bị phối cảnh, để ngưỡng 92% và dung sai ghim giữ nguyên ý nghĩa. Chiều sâu chỉ là lớp hiển thị.
- **Hai cách thể hiện:** (1) parallax 2D: nhiều lớp sprite có tỉ lệ và tốc độ trôi khác nhau, điểm sáng thu nhỏ và mờ dần khi đi vào; rẻ, hợp mobile. (2) camera nghiêng: đặt vải và đồ thị trên một mặt phẳng trong không gian 3D; đẹp hơn nhưng phải quy đổi vị trí chạm về mặt phẳng gốc và giữ vùng chọn node không nhỏ hơn mức tối thiểu khi ở xa. Mặc định dùng (1); chỉ dùng (2) cho level đặc biệt.
- **Dữ liệu level thêm:** trường `depthProfile` gồm kiểu (`none`, `parallax`, `tilt`), danh sách lớp (sprite, độ sâu 0–1, hệ số parallax, độ mờ), điểm tụ (vanishing point, chuẩn hóa 0–1), và đường cong độ sâu của điểm sáng (vị trí dọc viền từ 0 đến 1 sang tỉ lệ và độ mờ). Đánh dấu `tags` là `depth` để lọc và đo riêng.
- **Ràng buộc công bằng:** lớp nghệ thuật không được che node hay ghim; lớp gần hơn mặt phẳng chơi phải trong suốt hoặc nằm ngoài khung vải. Viền ngoài và bóng mờ hình mẫu vẫn phải đủ tương phản trên nền có chiều sâu. Điểm sáng thu nhỏ khi đi vào vẫn phải đủ lớn để nhìn thấy ghim nó đang đi qua (kích thước tối thiểu cần chốt).
- **Công cụ trong Level Editor:** thanh trượt xem trước độ sâu, danh sách lớp kèm độ sâu và hệ số parallax, tay kéo điểm tụ, trình chỉnh đường cong độ sâu của điểm sáng, nút bật tắt xem phần logic (mặt phẳng gốc) và phần hiển thị.
- **Kiểm tra hàng loạt thêm:** không có lớp nào che node hay ghim; điểm khớp trên mặt phẳng gốc không đổi khi bật hay tắt chiều sâu; số lớp và overdraw trong ngân sách hiệu năng (đề xuất tối đa 6 lớp, cần chốt).

## Meta loop: tiệm may

Người chơi là thợ may: mỗi khách đặt một món đồ, mỗi mảnh của món đồ là một màn. Bản đầu chỉ làm vòng nhận đơn tối thiểu trên màn Home; các lớp còn lại là mở rộng tương lai, chưa bắt buộc khi code.

### Màn Home: khách ở quầy (bản đầu)

- **Chuẩn bố cục:** màn hình dọc, theo wireframe dọc `Assets/Docs/GraphNode-Puzzle-Wireframe-Home.html` (khung 390×844 pt, tham khảo bố cục quầy của Good Pizza, Great Pizza). Wireframe chỉ chốt vị trí các vùng; giao diện, màu sắc và art chính thức do người dùng tự làm.
- **Không gian:** tiệm may nhìn từ sau quầy, phòng kín đủ 4 góc theo phối cảnh một điểm tụ: trần có đèn treo, hai tường bên, sàn ca rô và mặt tiền kính phía sau (kính trái, cửa ra vào giữa, kính phải). Trang trí mẫu: kệ cuộn vải trên tường trái, ma-nơ-canh trên sàn bên phải.
- **Vị trí các vùng (tỉ lệ theo chiều cao màn hình, đo trên wireframe):**

| Vùng | Vị trí |
| --- | --- |
| Chip số màn, nút cài đặt | Góc trên trái, góc trên phải, trong khoảng 0–7% |
| Trần và đèn treo | Khoảng 0–17% |
| Tường mặt tiền | Khoảng 17–59% |
| Bong bóng suy nghĩ | Giữa màn, khoảng 22–42%, phía trên đầu khách |
| Khách | Đứng giữa; đầu khoảng 47–58%, thân dưới bị quầy che |
| Quầy | Dải sát cạnh dưới, từ khoảng 83% tới đáy; máy tính tiền bên trái, hũ cúc, chỉ, kéo bên phải |
| Nút bắt đầu | Nằm trên mặt quầy, khoảng 90–98%, rộng gần hết màn |

- **Bong bóng suy nghĩ thay cho lời nhắn:** trên đầu khách là một đám khói suy nghĩ, bên trong là hình mảnh vải thật của màn kế tiếp. Cách vẽ chi tiết do người dùng chốt khi làm giao diện. Bản đầu không có chữ thoại.
- **Thẻ đơn:** tên món đồ, mảnh hiện tại trên tổng số mảnh, các ô tiến độ. Vị trí trên màn Home chưa có trong wireframe, chốt khi làm giao diện.
- **Bắt đầu màn:** chạm vào khách, vào bong bóng hoặc nút bắt đầu. Chuyển cảnh bong bóng phóng to thành bóng mờ hình mẫu trên tấm vải là tùy chọn, không bắt buộc ở bản đầu: có thể chỉ chuyển scene thường, kiến trúc đã chừa chỗ để thêm sau.
- **Sau màn:** quay về Home, thẻ đơn cập nhật mảnh vừa cắt (hiệu ứng mảnh bay vào thẻ là tùy chọn). Đủ mảnh thì khách mặc thử (biểu cảm vui), rồi khách kế tiếp bước vào.
- **Hình mẫu và món đồ:** hình mảnh áo (thân, tay, cổ) và hình trừu tượng như cá, tim, lá, sao. Hình trừu tượng là hình đắp hoặc hình thêu trên món đồ, để mọi hình đều có lý do trong câu chuyện may.
- **Dữ liệu:** `CustomerDefinition` (tên, chân dung, vài biểu cảm) và `OrderDefinition` (khách, món đồ, danh sách level theo thứ tự mảnh). Level không biết khách; khách chỉ là lớp bọc bên ngoài.
- **Rủi ro cần theo dõi:** hình trong bong bóng nhỏ hơn nhiều so với khung vải, nên hình nhiều node (như sao 7 cánh) cần kích thước và nét đủ dày để đọc được trên điện thoại. Khách che một phần bong bóng hoặc ngược lại thì phải xếp lớp rõ ràng.

### Mở rộng trong tương lai (chưa làm ở bản đầu)

- **Khách quen có câu chuyện:** khoảng 8–12 nhân vật quay lại nhiều lần, mỗi lần kể tiếp chuyện của họ trong 2–3 câu (cô gái chuẩn bị cưới, cậu bé vào lớp một, ông cụ đi họp lớp). Chi phí: chân dung vài biểu cảm và lời thoại; ít nhân vật nên dùng lại art.
- **Lookbook (album):** mỗi bộ đồ đã may được lưu cùng nhân vật mặc nó; gom đủ bộ sưu tập ("Mùa cưới", "Đồ đi học") thì được thưởng; có nút chụp và chia sẻ ảnh.
- **Vải và hoa văn mở khóa dần:** kẻ caro, chấm bi, lụa, thổ cẩm… là phần thưởng chính, dùng lại cảnh đổ màu. Có thể thêm bước chọn vải trước khi may, đúng sở thích khách thì được tiền boa.
- **Nâng cấp tiệm theo mốc cố định (đã chốt kiểu):** tiệm đẹp dần qua các bước định sẵn (máy may mới, kệ vải, quầy, đèn…), mở bằng tiền công. Không cho người chơi tự bày trí. Lợi ích: art làm theo từng bước, dễ cân bằng, ít UI.
- **Tiền công, tiền boa, sao:** đơn vị dùng cho các mở rộng trên. Chỉ thưởng thêm, không bao giờ phạt vì chậm hay vì dùng gợi ý.

### Ghi chú để thuyết trình (chưa làm)

- **Đơn theo mùa và sự kiện:** Tết may áo dài, Trung thu đồ cho bé, Halloween hóa trang, mỗi đợt có hình mẫu riêng như con lân, cái lồng đèn. Cho thấy game có đường làm live-ops sau ra mắt.

### Hình mẫu màn Home

- **Chuẩn:** wireframe dọc `Assets/Docs/GraphNode-Puzzle-Wireframe-Home.html`.
- **Tham khảo bố cục:** [Good Pizza, Great Pizza](https://store.steampowered.com/app/770810/), cảnh khách đứng trước quầy.
- **Bản vẽ cũ, không còn là chuẩn:** [các bản thử Home trước đây](https://claude.ai/artifact/R9qBftTCGP78BsTKknmPn7), chỉ để tham khảo.

## Đồ họa và cảm giác

Phong cách 2D phẳng, ấm áp, chủ đề may vá, giữ như bản minh họa quảng cáo: viền đậm, màu tươi nhưng dịu, chữ tròn.

### Bảng màu

| Tên | Mã màu | Dùng cho |
| --- | --- | --- |
| Nền | #FFF1E8 | Nền màn hình |
| Mực | #3A2340 | Viền, chữ, đường cắt |
| Nhấn | #C7385F | Nút chính, thanh khớp |
| Hồng | #E2557A | Điểm cong, miếng vải sau khi đổ màu |
| Vải | #F9D3CF | Tấm vải mặc định |
| Chỉ | #B8576E | Đường khâu viền vải, bóng mờ hình mẫu |
| Vàng | #FFC94D | Phần thưởng, hiệu ứng hoàn thành |

Font: Baloo 2, hỗ trợ đầy đủ tiếng Việt.

### Thành phần trên màn chơi

- **Tấm vải:** texture họa tiết lặp lại, viền chỉ khâu nét đứt.
- **Hình mẫu:** bóng mờ nét đứt trên vải, kèm thẻ nhỏ phía trên.
- **Đường cắt (viền ngoài):** nét đứt đậm như phấn may, nét chạy chậm để trông sống.
- **Cạnh bên trong:** nét mảnh, độ mờ khoảng 35%, cho thấy chúng không bị cắt.
- **Node:** điểm thẳng là ô vuông bo góc trắng, điểm cong là chấm tròn màu hồng; node bị khóa có thêm ghim kim may và viền xám.
- **Thanh khớp:** nằm phía trên vải, cạnh thẻ hình mẫu.

### Dựng hình

- Đường vẽ (đường cắt, cạnh, bóng mờ) dùng mesh tự sinh thay cho LineRenderer, để có nét đứt, nét chạy và góc bo đẹp.
- Vùng miếng vải là mesh tam giác hóa từ đa giác viền ngoài, UV theo texture vải. Miếng vải sau khi cắt là một object riêng để nhấc lên và bay đi.
- Hiệu ứng đổ màu từ dưới lên làm bằng shader có ngưỡng cắt theo trục dọc.
- Vùng tô và viền khi kéo: mặt nạ dùng để chấm điểm; để vẽ, tách đường viền từ mặt nạ, làm mượt rồi dựng mesh nét đứt, để không bị mờ hay răng cưa trên màn hình nét cao. Thử cả hai cách (vẽ thẳng từ mặt nạ và vẽ từ đường viền) ở mốc M2 rồi chọn một.

### Chuyển động, âm thanh, rung

| Khoảnh khắc | Chuyển động | Âm thanh | Rung |
| --- | --- | --- | --- |
| Chạm node | Phóng to 1,15 lần | Tiếng "póc" nhẹ | Nhẹ |
| Thả node | Nảy về cỡ cũ | Tiếng đặt xuống | Không |
| Thanh qua 70%, 85% | Thanh sáng lên | Tiếng "tách" cao dần | Nhẹ |
| Đạt ngưỡng (khóa thao tác) | Thanh nhấp nháy | Chuông ngắn | Trung bình |
| Cắt | Kéo chạy dọc viền | Kéo cắt vải kiểu ASMR | Nhịp nhẹ theo kéo |
| Hoàn thành sản phẩm | Máy may chạy, sản phẩm lấp lánh | Máy may, nhạc chiến thắng | Mạnh |

### Thao tác trên màn hình nhỏ

- Vùng chạm mỗi node tối thiểu 44 pt, lớn hơn hình vẽ của node.
- Khi kéo, hiện kính lúp phóng to vùng dưới ngón tay, hoặc đẩy node lệch lên trên ngón tay một đoạn để không bị che.
- Hai node chồng nhau thì chạm sẽ chọn node gần nhất với ngón tay.
- Vùng chọn node bán kính 70 đơn vị trên khung 400×560 (bản kéo lệch ban đầu dùng 26). Node bị khóa lắc tại chỗ và rung khi chạm.
- Cách kéo ban đầu: node nằm lệch lên trên ngón tay 34 đơn vị để không bị che. Đã thay bằng kéo tương đối (xem bên dưới).
- Kéo tương đối (đã chốt, cảm giác tốt khi thử): chạm trong vòng 70 đơn vị quanh node thì chọn node gần nhất, rồi trượt ngón tay ở bất kỳ chỗ nào. Node di chuyển đúng quãng ngón tay trượt, không nhảy lên khi chạm, nên ngón tay không phải đè lên node.
- Ngón tay có vòng mờ nhỏ và nét chấm nối tới node đang kéo, để người chơi biết mình đang kéo node nào.
- Node bị kẹp trong vùng 0,04 đến 0,96 của tấm vải. Nếu node gần nhất là node bị khóa thì node lắc và không kéo được. Cách kéo này dùng chung cho chuột và cảm ứng.
- Rủi ro: vòng chọn rộng có thể chọn nhầm node bên cạnh khi mật độ node cao (chiếc lá, trái tim). Đã chốt cách phòng ngừa, cần làm ngay khi chuyển sang Unity (các mục ngay dưới đây).
- **Vòng chọn theo mật độ:** bán kính chọn của mỗi node = một nửa khoảng cách tới node gần nhất khác, kẹp trong khoảng 26 đến 70 đơn vị. Hai vòng chọn liền kề không chồng nhau, nên node dày thì vòng nhỏ, node thưa thì vòng rộng. Tính lại mỗi khi node di chuyển.
- **Chạm đúng node gần nhất:** khi chạm vào vùng có hai vòng chồng nhau (do node bị kẹp ở mức tối thiểu 26), chọn node có khoảng cách tới ngón tay nhỏ hơn. Chạm ngoài mọi vòng chọn thì không chọn node nào.
- **Cho biết node đã chọn:** ngay khi chạm, node được chọn phóng to 1,15 lần và nét chấm nối tới ngón tay. Nếu chọn sai, người chơi nhấc tay ra chạm lại, không tốn lượt nào và không tính vào số lần kéo nếu chưa trượt quá 6 đơn vị.
- **Ngưỡng chấp nhận khi thử:** tỷ lệ lần chọn nhầm (kéo node khác ý định rồi phải nhấc tay chạm lại) dưới 5% ở màn chiếc lá. Nếu vượt, thêm cách chọn theo hướng trượt đầu tiên (chọn sau khi ngón tay trượt được 6 đơn vị).

## Kiến trúc hệ thống

Toán hình học (graph, đường cong, viền ngoài, điểm khớp) nằm trong một lõi C# thuần không phụ thuộc Unity, nên viết unit test được và thêm cơ chế mới không đụng tới phần hiển thị.

*[Sơ đồ trong tài liệu gốc: kiến trúc · 4 tầng, 15 module]*

Mỗi khi node di chuyển, phần điều khiển đưa vị trí mới vào lõi, nhận lại đường cắt và điểm khớp, rồi báo phần hiển thị vẽ lại.

**Chỗ dành sẵn cho cơ chế mới:**

- `INodeConstraint`: giới hạn cách node di chuyển (khóa, trượt trên ray, liên kết đối xứng).
- `IEdgeShape`: cách một cạnh sinh ra đường gấp khúc (thẳng, cong, răng cưa, cạnh cứng).
- `IWinCondition`: điều kiện thắng (khớp một hình, nhiều mảnh, khoét lỗ).
- `IPinRule`: luật của từng loại ghim (đi qua lúc nào cũng được, theo thứ tự, sau này theo nhịp).
- `IRunnerRule`: cách điểm sáng chạy (tốc độ, chiều, tăng tốc, sau này nhảy cổng hay hai điểm sáng).
- `IHintProvider`: cách đưa gợi ý và số lượt gợi ý, để meta thêm lượt gợi ý qua modifier mà không sửa code chơi.

**Cấu trúc thư mục đề xuất:** `Core/` (lõi, có Assembly Definition riêng), `Gameplay/` (điều khiển), `UI/`, `Data/`, `Editor/`, `Tests/`.

**Kế hoạch kiến trúc chi tiết:** hệ thống, assembly, cấu trúc thư mục, công nghệ và cách cắm meta loop nằm ở [GraphNode-Puzzle-Kien-truc.md](GraphNode-Puzzle-Kien-truc.md). Tài liệu đó thay cho cấu trúc thư mục đề xuất ở trên.

## Lộ trình triển khai

Làm từ lõi ra ngoài: toán hình học trước, màn chơi tối thiểu sau, cảm giác và nội dung cuối cùng. Mốc nào chưa qua cổng thì chưa sang mốc sau.

*[Sơ đồ trong tài liệu gốc: lộ trình · 5 mốc, 5 cổng]*

Thời gian cho từng mốc sẽ điền khi bạn chốt số người làm và quỹ thời gian.

## Chuẩn production trên Unity

Mục này là yêu cầu kỹ thuật để đưa game từ bản thử web sang bản cuối trên Unity. Các con số dưới đây là đề xuất khởi đầu, cần chốt khi bắt đầu dựng project; chỗ nào dựa trên project hiện có thì ghi rõ phiên bản.

### Nền tảng kỹ thuật

- **Project hiện có:** Unity 2022.3.62f3 (LTS), URP 14.0.12 với Renderer 2D, Input System 1.14.2, TextMeshPro 3.0.7, Test Framework 1.1.33. Thư mục Plugins đã có UniTask và DOTween. Thư mục Scripts còn trống.
- **Cần chốt trước khi làm tiếp:** khóa màn hình dọc (hiện đang để tự xoay), đổi tên công ty và gói (hiện là DefaultCompany), nâng Android min SDK theo máy mục tiêu (hiện 22), IL2CPP và ARM64 cho bản phát hành.
- **Gói chỉ dùng khi phát triển:** gói MCP for Unity chỉ dùng trong Editor, phải gỡ khỏi bản build phát hành.
- **Addressables:** chưa dùng. Level là dữ liệu nhỏ nên bản đầu tham chiếu trực tiếp hoặc nạp từ Resources; chỉ thêm Addressables nếu cần cập nhật level từ xa.

### Kiến trúc và quy ước code

- **Assembly:** tách `GraphNode.Core` (lõi, không tham chiếu UnityEngine, dùng struct toạ độ riêng và chuyển đổi ở biên), `GraphNode.Gameplay`, `GraphNode.UI`, `GraphNode.Data`, `GraphNode.Editor`, `GraphNode.Tests.EditMode`, `GraphNode.Tests.PlayMode`. Namespace trùng cấu trúc thư mục.
- **Máy trạng thái màn chơi:** một máy trạng thái rõ ràng với các pha như bản thử: Chơi, Kiểm tra, Snap, Cắt, Nhấc lên, Đổ màu, Ghép, Kết quả. Chuyển pha chỉ qua một chỗ. Animation bất đồng bộ dùng UniTask kèm CancellationToken gắn vòng đời màn, để thoát màn hay đặt lại không để lại animation chạy dở.
- **Dịch vụ:** âm thanh, rung, lưu trữ, telemetry nằm sau interface (`IAudioService`, `IHaptics`, `ISaveService`, `IAnalytics`), khởi tạo ở một điểm duy nhất. Không dùng singleton tĩnh cho dữ liệu màn chơi.
- **Dữ liệu:** mọi thông số cân bằng (ngưỡng, tốc độ điểm sáng, bán kính chọn, dung sai ghim, thang âm) đặt trong ScriptableObject, không ghi cứng trong code.
- **Quy ước:** `.editorconfig` và analyzer, đặt tên theo chuẩn C#, review trước khi gộp.

### Hiệu năng và bộ nhớ

- **Khung hình:** khóa cứng 60 fps theo chuẩn game casual. Khi khởi động đặt Application.targetFrameRate = 60 (mặc định của Unity trên mobile là 30). Màn chơi và Home phải giữ 60 fps ổn định trên các máy phổ biến, tức mỗi khung hình có 16,6 ms cho toàn bộ công việc. Chưa đặt mục tiêu riêng cho máy yếu.
- **Ngân sách lõi:** hướng tới khoảng 1 ms mỗi khung hình cho việc tính viền ngoài và điểm khớp (bản thử web đo khoảng 0,7 ms). Con số 1 ms là hướng dẫn cho riêng lõi; cổng bắt buộc là cả khung hình giữ 60 fps. Tối ưu khi đo thấy rơi khỏi 60 fps trên máy phổ biến.
- **Không cấp phát GC trong vòng Update khi đang kéo:** tái dùng mảng đệm cho mặt nạ, đường gấp khúc và danh sách giao điểm.
- **Mesh:** mesh viền và vùng vải cập nhật lại trên cùng một đối tượng, không tạo mới mỗi khung. Dùng SRP Batcher với Renderer 2D.
- **Kích thước build:** đề xuất dưới 100 MB cho bản đầu, cần chốt.

### Input và giao diện

- **Input System:** một hành động con trỏ dùng chung cho cảm ứng và chuột. Chỉ nhận một ngón; ngón thứ hai bị bỏ qua; mất focus ứng dụng thì hủy thao tác đang kéo.
- **Đơn vị:** mọi con số "đơn vị" trong bản thử (vùng chọn 26–70, dung sai ghim 16, vòng mờ 14) đang tính trên khung 400×560 của bản thử. Bản Unity dùng đơn vị theo bề rộng khung vải, quy đổi theo bảng Đơn vị đo bên dưới; vùng chạm vẫn không nhỏ hơn 44 pt.
- **Màn hình:** hỗ trợ safe area và tai thỏ; khung vải giữ tỉ lệ, máy tính bảng có thêm viền.

### Đơn vị đo

Mọi khoảng cách và tốc độ trong bản chính thức tính theo bề rộng khung vải (khung vải vuông nên dùng chung cho hai chiều). Vị trí trong dữ liệu level đã chuẩn hóa 0–1 nên không đổi. Các số còn ghi theo đơn vị bản thử ở chỗ khác trong tài liệu đều quy đổi theo bảng này (khung vải bản thử rộng 368 đơn vị).

| Thông số | Bản thử (đơn vị khung 400×560) | Bản chính thức (theo bề rộng vải) |
| --- | --- | --- |
| Vùng chọn node tối thiểu | 26 | 7,1% |
| Vùng chọn node tối đa | 70 | 19% |
| Dung sai ghim | 16 | 4,3% |
| Tốc độ điểm sáng | 250 mỗi giây | 68% mỗi giây |
| Vòng mờ quanh ngón tay (bán kính) | 14 | 3,8% |
| Quãng trượt tính là một lần kéo | 6 | 1,6% |

### Dữ liệu và lưu tiến trình

- **Lưu cục bộ** bằng JSON có `schemaVersion`, ghi nguyên tử (ghi file tạm rồi đổi tên) và có bản sao lưu khi file hỏng.
- **Nội dung lưu:** màn đã qua, thời gian tốt nhất, sản phẩm đã ghép, cài đặt (âm thanh, rung, giảm chuyển động).
- **Level:** file JSON là bản gốc, có `schemaVersion`; trình kiểm tra hợp lệ chạy trên chính file đó trong Editor và CI. Dữ liệu nhiều loại (loại ghim, điều kiện thắng, hình dạng cạnh) ghi một trường `kind` và dùng bộ chuyển đổi tự viết; không dùng chế độ tự ghi tên kiểu của Newtonsoft (kém an toàn, dễ hỏng khi IL2CPP cắt code).

### Âm thanh, rung, hiệu ứng

- **Âm thanh:** AudioMixer với các nhóm SFX, Music, UI. Một lớp phát nốt nhạc dùng pool AudioSource và giới hạn số giọng cùng lúc (đề xuất 8) để nốt không chồng nhau. Thang âm, độ lệch tông và âm lượng là dữ liệu.
- **Rung:** lớp trừu tượng cho iOS và Android, tắt được, theo cài đặt người dùng.
- **Hiệu ứng:** viền đổi màu tính theo góc quanh tâm vùng cắt; hạt dùng ParticleSystem có pool.

### Truy cập, ngôn ngữ

- **Giảm chuyển động:** tắt viền trôi, rút ngắn animation (bản thử đã có).
- **Không chỉ dựa vào màu:** ghim tròn và ghim số khác hình dạng; vùng cấm có gạch chéo.
- **Chữ:** Baloo 2 dùng TextMeshPro SDF, đủ bộ ký tự tiếng Việt. Mọi chuỗi đi qua bảng chuỗi, dù ban đầu chỉ có tiếng Việt, để thêm ngôn ngữ sau.

### Telemetry

Để đo các chỉ số ở mục Tổng quan, cần ghi các sự kiện: `level_start`, `level_complete` (thời gian, số lần kéo, gợi ý, đặt lại, đảo chiều), `verify_fail` (lý do: thiếu ghim hay sai thứ tự), `level_abandon`. Không thu dữ liệu cá nhân; có công tắc đồng ý theo quy định. Ghi qua `IAnalytics`, chọn nhà cung cấp sau.

### Kiểm thử

- **EditMode (lõi hình học):** dùng số liệu từ bản thử làm đối chiếu. Đáp án mỗi level cho điểm khớp 100%; lệch 0,02 cho kết quả trong khoảng ghi ở bảng độ nhạy; viền ngoài khi có cạnh chéo nhau; thứ tự ghim, gồm bản đối xứng gương thất bại và thành công khi đảo chiều.
- **Kiểm tra hàng loạt level** (Editor và CI): lời giải vượt ngưỡng, vị trí đầu chưa vượt, ghim nằm trên viền trong dung sai, không chồng vùng cấm.
- **PlayMode:** mỗi level chạy từ vào màn tới bảng kết quả không lỗi.
- **Thiết bị thật:** đề xuất tối thiểu 3 máy iOS và 3 máy Android trước mỗi bản phát hành, với checklist QA riêng.

### Build và phát hành

- IL2CPP, ARM64. Lưu ý cấu hình stripping để UniTask và DOTween không bị cắt nhầm.
- Đánh phiên bản major.minor.patch cộng số build. CI tự động dựng Android (AAB) và iOS (dự án Xcode). Ký bản phát hành theo quy trình của cửa hàng.
- Báo lỗi crash bằng dịch vụ chuẩn (cần chốt nhà cung cấp).

### Định nghĩa hoàn thành

Mỗi tính năng chỉ xong khi: chạy đúng trên thiết bị thật, giữ 60 fps trên máy thử, có unit test cho phần lõi, có ghi telemetry, không còn cảnh báo trong Console, đã qua review, và đã cập nhật tài liệu này.

### Rủi ro production

- Chuyển lõi từ JavaScript sang C# có thể lệch số liệu. Giữ bộ số liệu đối chiếu từ bản thử trong test.
- Dung sai ghim 16 đơn vị và vòng chọn theo mật độ chưa kiểm chứng trên màn hình thật.
- Hiệu năng mesh sinh động và mặt nạ trên máy yếu chưa đo.

## Bản thử web và kết quả đo

Bản thử chạy trên trình duyệt, chỉ là demo luật lõi để kiểm chứng vòng chơi trước khi làm trong Unity. Bản chính thức không lấy bản thử làm gốc cho hình ảnh, giao diện hay meta; chỉ dùng luật lõi và số liệu đo được làm đối chiếu. Lõi hình học (cạnh cong, viền ngoài, điểm khớp) viết tách khỏi phần hiển thị như đặc tả đề ra, nên có thể chuyển sang C# nguyên cấu trúc.

### Level đã dựng

| Màn | Hình | Node | Điểm cong | Node khóa | Cạnh trong | Khớp ban đầu |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Con cá | 7 | 3 | 1 | 1 | khoảng 40% |
| 2 | Ngôi nhà | 5 | 0 | 1 | 1 | khoảng 35% |
| 3 | Chiếc lá | 6 | 4 | 1 | 1 | khoảng 44% |
| 4 | Trái tim | 6 | 4 | 1 | 0 | khoảng 45% |

Mỗi level đều có ít nhất một chỗ viền tự cắt chéo nhau lúc bắt đầu. Hình mẫu được sinh từ chính vị trí lời giải, nên màn nào cũng có lời giải khớp 100%.

### Độ nhạy của ngưỡng thắng

Kết quả đo khi mọi điểm không khóa lệch khỏi lời giải một đoạn 0,02 (khoảng 7 px trên khung 368 px):

| Màn | Điểm khớp khi lệch 0,02 | Nhận xét |
| --- | --- | --- |
| Con cá | khoảng 90% | Khó ở ngưỡng 92%: hình nhỏ và mảnh |
| Ngôi nhà | khoảng 93% | Dễ chịu |
| Chiếc lá | khoảng 94% | Dễ chịu |
| Trái tim | khoảng 93% | Dễ chịu |

Vì vậy ngưỡng 92% chỉ dễ chịu với hình đủ to. Với hình nhỏ hoặc nhiều node, cần ngưỡng riêng cho từng level (trường `winThreshold`).

### Khác với đặc tả ban đầu

- **Ngưỡng thắng:** mặc định 92%; bản thử chỉ còn hai lựa chọn 92% và 95%. Giữ điều kiện điểm phải trên ngưỡng liên tục 0,1 giây.
- **Snap:** đang đưa node về vị trí lời giải lưu sẵn, chưa biến đường cắt về viền mẫu như đề xuất.
- **Tính điểm:** mặt nạ 200×200 thay cho Clipper2, tính mỗi khung hình (khoảng 0,7 ms) thay vì 2–3 khung một lần. Chưa có điều kiện độ lệch viền tối đa, nên một mũi nhọn nhỏ bị cụt vẫn có thể thắng.
- **Tiếp tuyến điểm cong:** lấy từ hai láng giềng trên vòng ngoài (Catmull-Rom). Điểm cong có nhiều hơn hai cạnh thì cạnh thêm dùng chiều gần nhất với hướng đi, chưa chốt được quy tắc cuối cùng.
- **Sản phẩm:** mỗi màn lấp một ô trong bộ vải ghép 4 ô.
- **Trên màn hình:** thêm bảng kết quả sau mỗi màn (thời gian, lần kéo, gợi ý, đặt lại) so với mục tiêu 30–90 giây, và ô bật để hiện % khớp thật.

### Link bản thử

- [Bản thử gốc: kéo tương đối, 4 màn, tô đầy, điểm chạy, ghim](https://claude.ai/artifact/B9DyTodTCCdETv1esSkSFf) (demo luật lõi; không phải gốc cho hình ảnh, giao diện hay meta)

## Cần chốt và mở rộng sau

Các điểm dưới đây cần chốt trước khi viết code, vì chúng ảnh hưởng tới cấu trúc dữ liệu và thuật toán.

- [x] Đã chốt: khi thanh đạt ngưỡng thì khóa thao tác và chạy vòng kiểm tra: điểm sáng đi qua mọi điểm và mọi ghim thì thắng, chạy animation rồi mới hiện bảng thắng (màn không có ghim vẫn kiểm tra qua các điểm).
- [ ] Snap bằng cách biến đường cắt về viền hình mẫu (đề xuất hiện tại), hay đưa node về vị trí lời giải lưu sẵn? Bản thử web đang dùng cách sau, cần thử thêm cách đầu.
- [ ] Có cho phép nhánh treo, tức cạnh không nằm trên vòng kín nào? Đề xuất: chưa cho trong prototype.
- [x] Đã chốt: ngưỡng thắng mặc định 92%, có thêm 95% để thử. Hình nhỏ hoặc nhiều node cần ngưỡng riêng theo level.
- [ ] Chấm theo cả vị trí trên vải, hay chỉ theo hình dạng (game tự căn miếng vải cho khớp rồi mới so)?
- [ ] Phiên bản Unity và render pipeline (đề xuất URP 2D).
- [ ] Điểm chạy dọc viền và nốt nhạc: giữ hay bỏ sau khi thử với người chơi? Theo dõi xem có gây mệt ở màn nhiều node không.
- [x] Đã chốt: dùng kéo tương đối, chưa thêm node tay nắm bên ngoài. Xem lại nếu người thử vẫn nói bị che hoặc chọn nhầm node ở màn nhiều node.
- [ ] Thêm điều kiện độ lệch viền tối đa vào cách tính thắng để không thắng khi cụt mũi nhọn.
- [ ] Nút đảo chiều điểm sáng: miễn phí, giới hạn 1 lần mỗi màn, hay tính như một lần Gợi ý? Luật thứ tự ghim chỉ còn gài buộc khi có từ 4 ghim số.
- [ ] Vùng cấm: chỉ nằm ngoài hình mẫu, hay làm cơ chế khoét lỗ để có vùng cấm nằm bên trong?
- [ ] Level chiều sâu: bao nhiêu level dùng, chọn parallax 2D hay camera nghiêng cho từng level, và kích thước tối thiểu của điểm sáng khi đi vào xa?

**Mở rộng sau prototype:** điểm liên kết, điểm trên ray, cạnh cứng, cạnh co giãn, gấp vải đối xứng, vải họa tiết, khoét lỗ, nhiều mảnh trên một tấm vải, meta tiệm may và khách hàng. Trường `tags` trong dữ liệu level và các giao diện ở phần kiến trúc đã chừa sẵn chỗ cho những cơ chế này.

### Ý tưởng mở rộng: vùng cấm

Đây mới là ý tưởng, chưa làm trong bản thử. Vùng cấm là những vùng đỏ trong suốt trên tấm vải mà vùng tô màu (miếng vải nhận được) không được phủ lên. Người chơi vẫn kéo node và đặt cạnh đi qua vùng cấm được; chỉ có phần tô là không được chạm.

- **Tác dụng:** ép viền ôm quanh chướng ngại vật, thêm một lớp giải đố cùng với node khóa và ghim: không chỉ khớp hình mà còn phải né đúng chỗ.
- **Cách tính:** giữ mặt nạ vùng cấm trên cùng lưới 200×200 với mặt nạ vùng tô. Diện tích chồng = số ô vùng tô nằm trong vùng cấm. Điều kiện thắng thêm: diện tích chồng không quá khoảng 0,5% diện tích hình mẫu (để chịu sai số vẽ). Tính cùng lượt với điểm khớp, chi phí rất nhỏ.
- **Thứ tự kiểm tra:** đạt ngưỡng khớp, rồi kiểm vùng cấm, rồi mới chạy vòng kiểm tra ghim. Nếu còn chồng vùng cấm thì không chạy vòng kiểm tra.
- **Phản hồi:** phần vùng tô chồng lên vùng cấm nhấp nháy đỏ, vùng cấm rung nhẹ và máy rung khi bị phủ lần đầu. Khi đạt ngưỡng khớp mà còn chồng, thanh khớp hiện "Chạm vùng cấm". Ngoài màu đỏ, vẽ thêm họa tiết gạch chéo để người khó phân biệt màu vẫn nhìn ra.
- **Ràng buộc để ý:** vì mọi thứ nằm trong viền ngoài đều bị tô, vùng cấm nằm lọt hẳn trong viền sẽ luôn vi phạm. Vùng cấm vì vậy phải nằm bên ngoài hình mẫu. Muốn vùng cấm là một lỗ bên trong thì cần cơ chế khoét lỗ (đã có trong danh sách mở rộng ở trên).
- **Dữ liệu và công cụ level:** thêm trường `forbiddenZones`, danh sách đa giác chuẩn hóa 0–1. Level Editor có công cụ vẽ đa giác; kiểm tra hàng loạt báo lỗi nếu lời giải mẫu chồng vùng cấm. Giao diện `IWinCondition` đã chừa sẵn chỗ cho điều kiện này.
