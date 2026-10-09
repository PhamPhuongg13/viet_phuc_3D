# Kế hoạch demo: Việt phục Remix

## 1. Ý tưởng

**Việt phục Remix** là ứng dụng phối đồ 3D tương tác cho học sinh, sinh viên. Người dùng chọn một dịp mặc, một dáng áo và gu cá nhân; ứng dụng mặc trang phục lên nhân vật 3D bằng Babylon.js, cho xoay và phóng gần để xem các chi tiết, giải thích vì sao các món đi cùng nhau và cho đọc một thẻ kiến thức ngắn có nguồn.

**Điểm nhấn khi trình bày audition:** Mỗi look có hai phần đặt cạnh nhau: **“Phối thế nào?”** (màu, phụ kiện, cảm giác tổng thể) và **“Hiểu trang phục”** (đặc điểm, bối cảnh, nguồn tham khảo). Người dùng được sáng tạo, đồng thời biết đâu là dáng áo gốc và đâu là lựa chọn phối đương đại.

## 2. Phạm vi văn hóa và người dùng

- **Nhóm trang phục cho bản demo:** áo dài hiện đại và áo dài ngũ thân tay chẽn. Hiển thị thành hai lựa chọn riêng, không dùng một hình áo để đại diện cho cả hai.
- **Bối cảnh:** lễ tốt nghiệp, Tết/đi chúc Tết, tham quan di sản hoặc sự kiện văn hóa. Đây là các tình huống gợi ý trong ứng dụng, không phải quy tắc bắt buộc về cách mặc.
- **Người dùng chính:** học sinh, sinh viên khoảng 15–24 tuổi muốn tìm một cách mặc phù hợp sự kiện, dễ hình dung, hợp sở thích và có thể chia sẻ với bạn bè.
- **Nhu cầu:** nhìn trang phục từ nhiều góc và xem trước màu, phụ kiện; hiểu sự khác nhau giữa hai dáng áo; biết chi tiết nào là kiến thức lịch sử, chi tiết nào là gợi ý sáng tạo; lưu hoặc so sánh hai phương án trước khi chọn.

## 3. Hành trình trải nghiệm

1. **Chọn dịp hoặc trang phục:** Người dùng bắt đầu từ thẻ “Tốt nghiệp”, “Tết”, “Tham quan di sản” hoặc từ “Áo dài hiện đại”, “Áo ngũ thân tay chẽn”. Có thể đổi lựa chọn ở bất cứ bước nào.
2. **Tự phối đồ:** Chọn một trong ba phong cách “Thanh lịch”, “Tối giản”, “Năng động” làm điểm bắt đầu, rồi tự đổi màu áo, màu quần, họa tiết và phụ kiện. Có bảng màu gợi ý và bộ chọn màu riêng. Tùy chọn “Gợi ý cho tôi” tạo một phương án mẫu nhưng người dùng vẫn sửa được từng món.
3. **Xem look:** Nhân vật 3D cập nhật ngay khi chọn. Kéo để xoay 360°, chạm nút để xem mặt trước/mặt sau và phóng gần chi tiết cổ, vạt, tay áo. Bên cạnh là tên look, bảng màu, các món đã chọn và 1–2 câu giải thích về cách phối. Có nút đổi nhanh giữa hai phương án A/B.
4. **Đọc thẻ văn hóa:** Thẻ 60–100 chữ nêu tên dáng áo, một đặc điểm nhận diện đã kiểm chứng, bối cảnh tham khảo và liên kết nguồn. Một nhãn nhỏ phân biệt **“Thông tin tư liệu”** với **“Gợi ý phối hiện đại”**.
5. **Lưu lookbook:** Lưu cấu hình look trong trình duyệt để mở lại nhân vật 3D; có thể thêm ảnh chụp góc nhìn hiện tại hoặc liên kết chia sẻ sau khi luồng chính hoàn thành. Với MVP, không cần tài khoản.

### Ví dụ hành trình demo 90 giây

Chọn “Tết” → chọn “Áo ngũ thân tay chẽn” → tự đổi màu áo sang xanh rêu, chọn họa tiết trơn và thêm giày đơn giản → xoay nhân vật 3D để xem dáng áo → phóng gần hàng khuy và mở thẻ kiến thức → đổi màu áo sang kem để tạo phương án B → so sánh A/B → lưu look.

## 4. Màn hình và chức năng MVP

| Màn hình | Nội dung chính | Tiêu chí hoàn thành |
| --- | --- | --- |
| Trang chọn | 3 thẻ sự kiện, 2 thẻ trang phục, hướng dẫn ngắn | Bắt đầu được từ sự kiện **hoặc** trang phục |
| Studio phối đồ | Nhân vật 3D trong Babylon.js, nút xoay/góc nhìn, bảng tùy chỉnh màu, họa tiết, phụ kiện, phong cách | Mọi lựa chọn cập nhật mô hình và danh sách món ngay; xoay được bằng chuột hoặc cảm ứng |
| Kết quả | Tên look, mô hình 3D, lý do gợi ý, thẻ văn hóa, nguồn | Có thể xem chi tiết trang phục và so sánh A/B |
| Lookbook | Các look đã lưu, xem lại, xóa | Dữ liệu còn sau khi tải lại trang; mở lại đúng cấu hình 3D |

**Mức tối thiểu để nộp:** chọn được trang phục hoặc sự kiện; tự đổi màu áo, họa tiết và ít nhất một phụ kiện; thấy mô hình 3D cập nhật và xoay được; đọc được thẻ kiến thức có nguồn. So sánh A/B và lookbook là phần cộng thêm nếu còn thời gian.

### Người dùng có thể tùy chỉnh gì?

| Thành phần | Trong MVP | Cách hiển thị trên mô hình 3D |
| --- | --- | --- |
| Trang phục | Chuyển giữa hai dáng áo | Thay mesh áo; giữ các lựa chọn màu/phụ kiện còn dùng được |
| Màu sắc | Chọn bảng màu gợi ý hoặc nhập màu riêng cho áo; chọn màu quần | Đổi material của từng vùng, không tô đè lên khuy và chi tiết nhận diện |
| Họa tiết | Chọn mẫu nền rồi vẽ tự do, thêm icon hoặc ký tự/emoji trong editor 2D | Vẽ thiết kế lên texture mặt trước áo; lưu các nét và icon cùng look để sửa tiếp |
| Phụ kiện | Bật/tắt và chọn túi, giày hoặc khăn từ danh mục ngắn | Hiện/ẩn mesh tại vị trí đã gắn sẵn |
| Phong cách | Chọn một preset rồi chỉnh tiếp từng mục | Preset chỉ điền cấu hình ban đầu, không khóa lựa chọn |

Luôn có **“Hoàn tác”** và **“Đặt lại look”** để người dùng thử nhiều phương án. Khi đổi trang phục, nếu một họa tiết hoặc phụ kiện không có trong mẫu mới, giao diện báo rõ lựa chọn nào đã được thay bằng giá trị mặc định. Với MVP, người dùng tùy chỉnh cách phối trên các mẫu 3D đã dựng; việc tự sửa phom/cắt may hoặc tự tạo model nằm ngoài phạm vi demo.

## 5. Quy tắc gợi ý và bảo đảm phù hợp văn hóa

- Dùng **bộ dữ liệu biên tập sẵn** cho từng dáng áo: tên, các đặc điểm nhận diện, thẻ kiến thức, nguồn, ảnh tham khảo được phép sử dụng, và những tùy chọn phối có thể hiển thị. Không để mô hình AI tự viết các khẳng định lịch sử chưa kiểm chứng.
- Giữ dáng áo và tên gọi nhất quán trong mô hình 3D; dùng mô hình riêng cho hai kiểu áo và kiểm tra dáng từ trước, sau, hai bên. Nếu chọn một chi tiết làm thay đổi rõ cấu trúc của áo ngũ thân, giao diện gắn nhãn **“lấy cảm hứng từ áo ngũ thân”** thay vì giới thiệu như một mẫu truyền thống nguyên bản.
- Cho phép chọn màu tự do nhưng ghi rõ đây là **mô phỏng phối đồ hiện nay**, không suy ra màu đó là màu truyền thống của kiểu áo. Họa tiết được chọn từ danh mục đã duyệt; không gán ý nghĩa văn hóa cho họa tiết trang trí do nhóm tự tạo.
- Với phụ kiện hoặc họa tiết gắn với nghi lễ, địa vị hay cộng đồng cụ thể, chỉ đưa vào sau khi đã kiểm tra nguồn và hỏi người am hiểu phù hợp. Trong MVP, dùng phụ kiện thông dụng để tránh gán sai ý nghĩa.
- Cảnh báo bằng ngôn ngữ gợi ý, ví dụ: “Cách phối này thay đổi một đặc điểm nhận diện của áo; hãy gọi đây là bản cách tân.” Cho người dùng xem lý do và đổi lựa chọn; không chấm điểm “đúng/sai văn hóa” cho sở thích cá nhân.
- Mỗi thẻ văn hóa lưu **URL nguồn, tên đơn vị, ngày kiểm tra và người duyệt nội dung**. Khi có thông tin lịch sử còn nhiều quan điểm, nêu rõ đó là diễn giải theo nguồn đang dẫn, không khẳng định duy nhất.

**Nguồn khởi đầu để biên tập nội dung:**

- [Bảo tàng Phụ nữ Việt Nam – Thời trang và nghệ thuật tạo hoa văn](https://baotangphunu.org.vn/thoi-trang-va-nghe-thuat-tao-hoa-van/): tư liệu tổng quan về trang phục Việt, áo tứ thân, áo ngũ thân và sự biến đổi của áo dài. Dùng để viết thẻ tổng quan, sau đó kiểm tra kỹ từng câu chữ.
- [Bảo tàng Lịch sử Quốc gia – Áo dài ngũ thân truyền thống](https://baotanglichsu.vn/vi/Articles/3090/72685/bao-tang-lich-su-quoc-gia-tiep-nhan-ao-dai-ngu-than-truyen-thong.html): mô tả một hiện vật áo ngũ thân tay chẽn, gồm khuy, tay áo và kỹ thuật may. Không khái quát mọi chi tiết của hiện vật thành quy tắc cho tất cả áo ngũ thân.

## 6. Cách làm bản demo

- **Công nghệ:** web app TypeScript + React + Babylon.js. Dùng `@babylonjs/core` cho cảnh 3D; giao diện chọn đồ là HTML/CSS cạnh canvas, dễ dùng trên điện thoại. Khi có mô hình được duyệt để phát triển tiếp, Babylon.js hỗ trợ nhập `.glb`/glTF qua loader: [tài liệu chính thức](https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF/).
- **Tài sản 3D của MVP:** dựng nhân vật và **hai nhóm mesh áo riêng** (áo dài hiện đại, áo ngũ thân tay chẽn) trực tiếp bằng Babylon.js, cùng quần/giày và phụ kiện. Cách này giúp bản demo tự chứa và đổi màu theo thời gian thực. Mô hình là minh họa 3D, không phải bản phục dựng hiện vật. Nếu thay bằng tài sản Blender/`.glb` sau này, giữ cùng tỉ lệ, vị trí gốc và tên mesh/material; ghi nguồn và giấy phép của từng tài sản.
- **Cảnh 3D:** camera xoay quanh nhân vật, đèn mềm, nền đơn giản và giới hạn khoảng phóng để người dùng luôn thấy rõ bộ đồ. Khi đổi trang phục, bật nhóm mesh tương ứng; khi đổi màu, cập nhật material; khi đổi họa tiết, vẽ lại texture trên bề mặt áo; khi chọn phụ kiện, bật mesh tại vị trí đã chuẩn bị trên nhân vật. Giữ một tư thế đứng để giảm thời gian làm hoạt ảnh và lỗi xuyên mesh.
- **Tương tác:** kéo hoặc vuốt để xoay; nút “Trước”, “Sau”, “Phóng gần” cho người không quen thao tác 3D. Có trạng thái tải mô hình và thông báo nếu WebGL không chạy. Không cần mô phỏng vật lý vải cho bản demo.
- **Hiệu năng:** dùng mesh ít chi tiết vừa đủ nhìn rõ dáng áo, texture có kích thước hợp lý, nén và đóng gói tài sản để tải nhanh; thử trên điện thoại tầm trung. Chỉ tải những model cần cho màn hình đang xem; giữ ảnh xem trước tĩnh khi mô hình đang tải.
- **Gợi ý:** bảng luật đơn giản theo `trang_phuc + su_kien + phong_cach`; mỗi luật trả về màu gợi ý, phụ kiện, câu giải thích và lưu ý văn hóa nếu có. Không cần tạo ảnh bằng AI trong đường đi chính của demo.
- **Dữ liệu:** dữ liệu cục bộ cho danh mục trang phục, sự kiện, bảng màu, họa tiết, phụ kiện, thẻ kiến thức và URL nguồn. Một look lưu `garmentId`, `eventId`, `styleId`, màu áo/quần, `patternId` và các `accessoryIds`; dùng cùng cấu hình đó để cập nhật cảnh, hoàn tác và lưu vào `localStorage`.
- **Khả năng dùng:** nút có nhãn, tương phản màu đủ rõ, không truyền ý nghĩa chỉ bằng màu; cho phép chọn góc nhìn bằng bàn phím và có mô tả chữ về bộ đồ đang hiển thị.

## 7. Thứ tự triển khai

1. **Nội dung và thiết kế:** chốt hai dáng áo, viết 2 thẻ văn hóa từ nguồn đã kiểm tra, phác họa giao diện và kiểm tra tài liệu tham khảo cho người dựng model.
2. **Mẫu 3D đầu tiên:** dựng nhân vật và một mẫu áo ngũ thân tay chẽn bằng mesh Babylon.js, làm camera xoay và đổi một màu áo. Đây là mốc kiểm tra sớm nhất vì chất lượng model quyết định demo.
3. **Luồng tùy chỉnh:** thêm mẫu áo dài hiện đại, bảng chọn màu và họa tiết, phụ kiện, phong cách, hoàn tác/đặt lại; cập nhật model theo từng lựa chọn.
4. **Giải thích và hoàn thiện:** thêm luật gợi ý, nhãn “tư liệu / phối hiện đại”, thẻ nguồn và cảnh báo mềm; sau đó làm so sánh A/B, lookbook nếu còn thời gian. Kiểm tra trên điện thoại và diễn tập hành trình 90 giây.

## 8. Kiểm tra trước khi trình bày

- Người mới có thể tạo một look và tìm thấy thẻ kiến thức trong khoảng 1 phút.
- Hai dáng áo có mesh và tên gọi khác nhau; nhìn từ trước và sau không thấy phụ kiện trôi hoặc lớp vải xuyên qua cơ thể. Đổi sự kiện không làm mất lựa chọn mà người dùng đã chủ động chỉnh.
- Mô hình xoay/phóng mượt trên thiết bị demo; thay màu và phụ kiện không cần tải lại trang. Nếu tài sản 3D tải chậm, màn hình vẫn có ảnh xem trước và thông báo rõ.
- Có thể tạo hai look khác nhau từ cùng một kiểu áo bằng màu, họa tiết hoặc phụ kiện; hoàn tác và đặt lại trả về đúng trạng thái. Nếu làm lookbook, look đã lưu mở lại đúng các lựa chọn.
- Mọi câu về nguồn gốc hoặc đặc điểm trang phục trong giao diện đều có nguồn kiểm chứng; gợi ý thời trang được trình bày như gợi ý.
- Đường đi chính không phụ thuộc API bên ngoài; dữ liệu và tài sản 3D được phục vụ cùng ứng dụng. Nếu muốn demo hoàn toàn ngoại tuyến, chuẩn bị bản chạy cục bộ hoặc thêm cơ chế lưu tài sản trước sự kiện.

## 9. Hướng mở rộng sau audition

Chỉ sau khi MVP chạy tốt: thêm áo tứ thân và trang phục vùng miền với người am hiểu nội dung; gợi ý theo thời tiết; tùy chỉnh vóc dáng nhân vật 3D; kiểm tra hài hòa màu; chụp ảnh góc nhìn 3D và chia sẻ lookbook. Thử đồ trên ảnh cá nhân là một hướng phát triển riêng vì cần xử lý hình ảnh và quyền riêng tư.

## 10. Trạng thái bản demo hiện tại

- Studio Babylon.js đã có hai mẫu áo riêng: áo dài hiện đại dùng GLB Meshy AI do người dùng cung cấp, áo ngũ thân dùng mesh dựng bằng code. Cả hai đổi màu áo/quần, họa tiết và phụ kiện theo thời gian thực; xem trước, sau, phóng gần và kéo xoay.
- Mục Họa tiết mở editor texture 2D. Người dùng chọn mẫu nền, vẽ bằng chuột/cảm ứng, đổi màu và cỡ nét, đặt icon hoặc ký tự/emoji, hoàn tác/xóa rồi áp lên mặt trước áo. Bản vẽ được lưu cùng lookbook dưới dạng các nét và dấu icon để mở lại và sửa tiếp.
- Có hoàn tác, đặt lại, so sánh A/B, lưu lookbook trong trình duyệt và xuất ảnh PNG.
- Đã tạo ba ảnh ý tưởng bằng AI cho áo ngũ thân, áo dài và áo tứ thân, mở từ nút **“Ảnh tham khảo”**. Áo tứ thân cũng có thẻ mở ảnh riêng trong mục Dáng áo; đây là ảnh 2D, chưa có mô hình 3D để tùy chỉnh. Các ảnh có màu cố định và không phản ánh các lựa chọn tùy chỉnh trong Studio.
- File Meshy được cung cấp là một mesh duy nhất, không có material/texture/UV riêng. Demo nhóm các mặt thành bốn material, rồi tạo UV tự động để vẽ thiết kế trực tiếp lên texture mặt trước áo. Ranh giới vật liệu và UV vẫn là xấp xỉ. Bước nâng chất lượng tiếp theo là tách mesh trong Blender, làm UV chuẩn và kiểm tra đặc điểm trang phục trước khi xuất `.glb` mới.
