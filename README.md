# Việt Phục Remix

Demo phối Việt phục 3D bằng Babylon.js, React và Vite. Người dùng có thể chọn dịp, đổi giữa áo dài hiện đại và áo ngũ thân tay chẽn, chỉnh màu áo/quần, họa tiết, phụ kiện, rồi xoay hoặc phóng gần nhân vật để xem kết quả. Áo dài hiện đại sử dụng file GLB do người dùng tạo bằng Meshy AI.

## Chạy trên máy

```bash
npm install
npm run dev
```

Mở địa chỉ Vite in ra, thường là `http://localhost:5173`. Để kiểm tra bản production:

```bash
npm run build
npm run preview
```

## Những gì bản demo đã có

- Studio Babylon.js với GLB Meshy AI cho áo dài hiện đại và mesh dựng bằng code cho áo ngũ thân; xem mặt trước/mặt sau và phóng gần.
- Tùy chỉnh màu, họa tiết, phụ kiện, preset phong cách; hoàn tác và đặt lại.
- Editor texture 2D mở từ mục Họa tiết: vẽ tự do, chọn màu/cỡ nét, đặt icon có sẵn hoặc ký tự/emoji, hoàn tác nét, xóa và áp lên mặt trước áo 3D. Các nét và icon được lưu cùng lookbook để mở lại và sửa tiếp.
- Ghim phương án A để so sánh với phương án B trên cùng nhân vật.
- Lưu và mở lại lookbook bằng `localStorage`, không cần tài khoản.
- Tải ảnh PNG của khung hình 3D hiện tại.
- Thẻ kiến thức ngắn với liên kết đến Bảo tàng Lịch sử Quốc gia và Bảo tàng Phụ nữ Việt Nam.
- Ba ảnh ý tưởng được tạo bằng imagegen để tham khảo dáng áo và chất liệu; mở bằng nút “Ảnh tham khảo” hoặc thẻ áo tứ thân trong Studio.

## Ghi chú nội dung và mô hình

File `public/models/sage-elegance.glb` là bản sao của `Meshy_AI_Sage_Elegance_1008164226_generate.glb` do người dùng cung cấp. Model chỉ có một mesh, không có material, texture hoặc UV tách riêng. Ứng dụng phân nhóm các mặt áo, quần, da và giày thành bốn material khi tải; tạo UV phẳng cho áo, rồi vẽ thiết kế người dùng lên `DynamicTexture`. Họa tiết không còn là mesh nổi; phụ kiện vẫn là các mesh Babylon.js. Bản vẽ được lưu dưới dạng nét và dấu icon nên có thể sửa lại. UV tự tạo có thể khiến họa tiết hơi kéo giãn theo nếp vải. Áo ngũ thân vẫn là mesh dựng bằng code để giữ hàng khuy lệch đặc trưng và cũng dùng texture cho họa tiết. Cả hai là minh họa cách phối, chưa phải bản phục dựng hiện vật hay mẫu rập may.

Các họa tiết trong demo là đồ họa trang trí do nhóm tạo; ứng dụng không gán cho chúng ý nghĩa nghi lễ hay lịch sử. Màu và phụ kiện được mô tả là lựa chọn phối đương đại.

## Ảnh ý tưởng

- `public/references/ngu-than-concept.png`: ảnh mannequin mặc áo ngũ thân tay chẽn xanh ngọc, tạo bằng imagegen từ prompt sản phẩm toàn thân với cổ đứng, hàng khuy lệch, tay chẽn, tà dài và quần màu ngà.
- `public/references/ao-dai-concept.png`: bản chỉnh sửa bằng imagegen từ ảnh trên, giữ pose/mannequin và đổi trang phục sang áo dài hiện đại màu đỏ đất.
- `public/references/tu-than-concept.png`: bản chỉnh sửa bằng imagegen theo cùng phong cách mannequin, minh họa áo tứ thân màu chàm với yếm, dải lụa buộc eo và váy dài. Có ảnh nhỏ tại `public/references/thumbs/tu-than.jpg`.

Ảnh là gợi ý hình ảnh, có màu mẫu cố định; phần phối đồ tương tác vẫn dùng mô hình Babylon.js. Áo tứ thân hiện chỉ có ảnh 2D, chưa có mô hình 3D để tùy chỉnh. Ảnh AI không được dùng như bằng chứng lịch sử.
