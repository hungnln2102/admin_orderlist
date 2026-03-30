# Kế Hoạch Refactor Tổng Thể

Ngày cập nhật: `2026-03-29`

## Mục tiêu

Tài liệu này chốt một hướng refactor thống nhất cho `admin_orderlist` với các mục tiêu:

- dễ tìm file và lần theo logic
- dễ sửa một tính năng mà không phải chạm dây chuyền quá nhiều nơi
- giảm file quá lớn, giảm prop-drilling, giảm helper bucket
- tách rõ code runtime, code domain, code shared, và script vận hành
- tinh gọn bộ máy nhưng vẫn giữ hành vi hiện tại ổn định

Hướng được chọn: **modular monolith theo business domain**.

Đây là hướng phù hợp nhất cho repo hiện tại vì:

- hệ thống đã có nhiều domain đủ lớn để tách riêng
- repo chưa cần microservices
- một số chỗ đã có dấu hiệu modular hóa nhưng chưa đồng bộ
- nếu refactor kiểu "big-bang" theo layer kỹ thuật, repo sẽ rối hơn thay vì sạch hơn

## Nguyên tắc kiến trúc đích

| Nguyên tắc | Áp dụng |
| --- | --- |
| Refactor theo domain | Mỗi nhóm chức năng lớn có folder riêng: `orders`, `renew-adobe`, `product-pricing`, `package-products`, `supplies`, `dashboard`, `invoices` |
| Page và controller phải mỏng | Chỉ điều phối request, state, navigation, không ôm business logic dài |
| Shared chỉ chứa thứ dùng chung thật sự | Nếu logic chỉ phục vụ một domain thì đặt trong domain đó |
| Một domain có một điểm vào rõ ràng | Route, API client, types, hooks, use-case nên cùng tên domain để dễ search |
| Tách theo trách nhiệm, không tách theo số dòng | Chỉ chia file khi mỗi file mới có vai trò rõ ràng |
| Không giữ legacy song song | Không để route trùng, entry trùng, helper trùng vai trò, artifact build lẫn trong source |
| Refactor theo phase | Mỗi phase hoàn thành xong mới chuyển phase tiếp theo |

## Kiến trúc đích đề xuất

### Backend

```txt
backend/src/
  app.js
  server.js
  core/
    config/
    db/
    middleware/
    logger/
  domains/
    orders/
      routes.js
      controller/
      use-cases/
      repositories/
      mappers/
      validators/
      pricing/
    renew-adobe/
      routes.js
      controller/
      use-cases/
      repositories/
      adapters/
        browser/
        http/
        mail/
      mappers/
      validators/
    product-pricing/
    package-products/
    product-info/
    supplies/
    dashboard/
    invoices/
    promotions/
    warehouse/
  shared/
    contracts/
    utils/
```

### Frontend

```txt
frontend/src/
  app/
    App.tsx
    routes.tsx
    providers/
  features/
    auth/
    orders/
      pages/
      components/
      hooks/
      api/
      types.ts
      utils/
    renew-adobe/
      pages/
      components/
      hooks/
      api/
      types.ts
      utils/
    product-pricing/
    package-products/
    product-info/
    supplies/
    dashboard/
    invoices/
  shared/
    ui/
    api/
    hooks/
    utils/
    types/
  assets/
  styles/
```

## Quy định kích thước file

| Loại file | Ngưỡng nên giữ |
| --- | --- |
| Backend route | `<= 80` dòng |
| Backend controller | `<= 150` dòng |
| Backend use-case hoặc service | `<= 200` dòng |
| Backend repository hoặc query file | `<= 200` dòng |
| Frontend page hoặc container | `<= 200` dòng |
| Frontend hook | `<= 250` dòng |
| Frontend component | `<= 200` dòng |
| Frontend modal lớn | `<= 250` dòng |
| Utility file | `<= 150` dòng, ưu tiên pure function |

Ngoại lệ:

- Playwright hoặc browser adapter có thể dài hơn, nhưng vẫn phải tách theo step hoặc theo màn hình.

## Mapping từ cấu trúc hiện tại sang cấu trúc đích

| Hiện tại | Đích đến đề xuất |
| --- | --- |
| `backend/src/controllers/RenewAdobeController` | `backend/src/domains/renew-adobe/controller` + `use-cases` + `repositories` + `adapters` |
| `backend/src/services/adobe-http` | `backend/src/domains/renew-adobe/adapters/browser` và `adapters/http` |
| `backend/webhook/sepay/renewal.js` | `backend/src/domains/orders/renewal` hoặc `backend/src/domains/renewals` |
| `backend/src/controllers/Order/*` | `backend/src/domains/orders/*` |
| `frontend/src/pages/CustomerCtv/RenewAdobeAdmin` | `frontend/src/features/renew-adobe/*` |
| `frontend/src/pages/Product/PriceList` | `frontend/src/features/product-pricing/*` |
| `frontend/src/pages/Product/PackageProduct` | `frontend/src/features/package-products/*` |
| `frontend/src/pages/Product/ProductInfo` | `frontend/src/features/product-info/*` |
| `frontend/src/pages/Personal/Supply` | `frontend/src/features/supplies/*` |
| `frontend/src/lib/api.ts` | `frontend/src/shared/api/client.ts` + các file `features/*/api/*.ts` |
| `frontend/src/lib/helpers.ts` | tách thành `shared/utils/date.ts`, `money.ts`, `status.ts`, `orders.ts`, ... |

## Thứ tự refactor tối ưu

Nên triển khai theo đúng thứ tự sau:

1. khóa chuẩn kiến trúc và quy tắc đặt tên
2. dọn `shared`, helper bucket, route trùng, artifact build
3. refactor `renew-adobe`
4. refactor `product-pricing`
5. refactor `package-products`
6. refactor `orders`
7. refactor `supplies`, `dashboard`, `invoices`, `customer-ctv`
8. hardening, test, tài liệu, và xóa legacy

Lý do:

- `renew-adobe` đang rối nhất nhưng khá độc lập
- `product-pricing` và `package-products` đang có nhiều file rất lớn, ảnh hưởng maintainability ngay
- `orders` đã có vài phần tách tốt hơn nên có thể làm sau khi pattern chung đã ổn

## Bảng kế hoạch tổng

| Phase | Mục tiêu | Phạm vi | Deliverable | Điều kiện hoàn thành |
| --- | --- | --- | --- | --- |
| `P0` | Khóa hướng kiến trúc | docs, naming, conventions, file-size rules | roadmap chính thức, quy tắc đặt tên, quy tắc tách file | cả team dùng cùng một cách tổ chức |
| `P1` | Dọn shared và legacy có rủi ro cao | route trùng, helper bucket, root package, build artifact | shared sạch hơn, route rõ hơn, ít duplication | không còn route trùng và helper bucket tổng quát |
| `P2` | Refactor `renew-adobe` backend và frontend | controller, services, browser adapters, admin screen | domain `renew-adobe` hoàn chỉnh | search theo `renew-adobe` ra đúng toàn bộ logic liên quan |
| `P3` | Refactor `product-pricing` | `PriceList`, row component, hooks, API liên quan | feature `product-pricing` dễ đọc, ít prop-drilling | chỉnh sửa pricing không phải đụng quá nhiều file lớn |
| `P4` | Refactor `package-products` | page, modal, hooks, sections, API | feature `package-products` dễ tìm và dễ mở rộng | không còn page hoặc modal khổng lồ |
| `P5` | Refactor `orders` | frontend orders, modals, backend use-case, renewal | feature và domain `orders` có boundary rõ | create, edit, renew, delete đi theo use-case ổn định |
| `P6` | Refactor các domain còn lại | `supplies`, `dashboard`, `invoices`, `promotions`, `customer-ctv` | phần còn lại đồng bộ theo cùng chuẩn | toàn repo theo một mô hình thống nhất |
| `P7` | Hardening | tests, scripts, docs, cleanup | smoke test, docs update, dọn code cũ | repo gọn, dễ onboarding, dễ review |

## Backlog ưu tiên cao

| Ưu tiên | Domain | Vấn đề hiện tại | File nên tách trước |
| --- | --- | --- | --- |
| `P1` | Renew Adobe | backend controller quá lớn, frontend admin page quá lớn, browser adapter quá lớn | `backend/src/controllers/RenewAdobeController/index.js`, `backend/src/services/adobe-http/loginBrowser.js`, `frontend/src/pages/CustomerCtv/RenewAdobeAdmin/index.tsx` |
| `P1` | Product Pricing | row component quá lớn, hook quá lớn, prop-drilling nặng | `frontend/src/pages/Product/PriceList/components/ProductRow.tsx`, `frontend/src/pages/Product/PriceList/hooks/useProductActions.ts`, `frontend/src/pages/Product/PriceList/hooks/useSupplyActions.ts` |
| `P1` | Package Products | page và modal ôm quá nhiều state và event handler | `frontend/src/pages/Product/PackageProduct/PackageProduct.tsx`, `frontend/src/pages/Product/PackageProduct/components/Modals/PackageFormModal.tsx` |
| `P2` | Shared API và Helpers | `api.ts` và `helpers.ts` đang là bucket tổng | `frontend/src/lib/api.ts`, `frontend/src/lib/helpers.ts` |
| `P2` | DB Schema | một file schema quá lớn, domain nào cũng phụ thuộc | `backend/src/config/dbSchema.js` |
| `P2` | Mail OTP | service ôm DB lookup, IMAP, parsing, debug trong một file | `backend/src/services/mailOtpService.js` |
| `P3` | Forms routes | route trùng và convention chưa thống nhất | `backend/src/app.js`, `backend/src/routes/formsRoutes.js`, `backend/src/routes/formInfoRoutes.js` |

## Kế hoạch chi tiết theo phase

### Phase `P0` - Khóa chuẩn

| Việc | Cách làm |
| --- | --- |
| Chốt kiến trúc | Dùng `domains/` cho backend và `features/` cho frontend |
| Chốt naming | Folder, route, API client, hook, type cùng tên domain |
| Chốt boundary | Domain local trước, chỉ đưa vào shared khi dùng từ 2 domain trở lên |
| Chốt quy tắc file size | Bắt đầu tách khi file vượt ngưỡng trong tài liệu này |
| Chốt quy tắc import | Ưu tiên feature-local import, hạn chế relative import quá sâu |

### Phase `P1` - Dọn shared và legacy

| Việc | Cách làm |
| --- | --- |
| Tách `api.ts` | Tách thành `shared/api/client.ts`, `shared/api/errors.ts`, và các file `features/*/api/*.ts` |
| Tách `helpers.ts` | Tách theo nhóm `date`, `money`, `status`, `orders`, `sepay`, ... |
| Xóa route trùng | Hợp nhất `formsRoutes` và `formInfoRoutes`, bỏ khai báo lặp trong `app.js` |
| Dọn root package | Làm rõ vai trò `package.json` ở root, `backend`, và `frontend` |
| Dọn artifact | Không track `dist` nếu không phục vụ deploy trực tiếp |

### Phase `P2` - Refactor Renew Adobe

Backend đề xuất:

```txt
backend/src/domains/renew-adobe/
  routes.js
  controller/
    accountsController.js
    userOrdersController.js
    productSystemController.js
  use-cases/
    runAccountCheck.js
    runBatchAddUsers.js
    runAutoDeleteUsers.js
    runAutoAssignUsers.js
    fixSingleUser.js
  repositories/
    accountRepository.js
    userOrderRepository.js
    productSystemRepository.js
  adapters/
    browser/login/
    browser/manage-team/
    http/
    mail/
  mappers/
  validators/
```

Frontend đề xuất:

```txt
frontend/src/features/renew-adobe/
  pages/AdminPage.tsx
  components/
    AccountsTable.tsx
    QueueStatusPanel.tsx
    ProductSystemPanel.tsx
    UrlAccessCell.tsx
    StatusBadge.tsx
  hooks/
    useRenewAdobeAccounts.ts
    useCheckAllAccounts.ts
    useAutoAssign.ts
  api/
    renewAdobeApi.ts
  types.ts
  utils/
```

### Phase `P3` - Refactor Product Pricing

| Việc | Cách làm |
| --- | --- |
| Giảm prop-drilling | Tách row-level hooks và local state cho product edit, supply edit |
| Tách component lớn | Tách `ProductRow` thành summary, expanded detail, supply table, edit panel |
| Tách action hooks | `useProductCreate`, `useProductEdit`, `useSupplyRows`, `useProductStatus` |
| Tách API | Đưa pricing API về feature-local |
| Dọn types | Gom type của feature vào một vùng rõ ràng |

### Phase `P4` - Refactor Package Products

| Việc | Cách làm |
| --- | --- |
| Tách orchestration khỏi page | Page chỉ giữ state điều phối và open hoặc close modal |
| Tách modal logic | `usePackageForm`, `WarehouseSelector`, `ManualWarehouseFields`, `InlineAccountEditor` |
| Tách CRUD flow | create template, edit template, add row, edit row, delete row thành hook hoặc use-case riêng |
| Đồng bộ naming | Dùng một naming thống nhất cho `package-products` |

### Phase `P5` - Refactor Orders

| Việc | Cách làm |
| --- | --- |
| Đồng bộ domain `orders` | list, create, edit, renew, pricing, finance, deletion theo một domain duy nhất |
| Tách frontend modals | modal chỉ render; state, submit, side effects chuyển về hooks |
| Tách backend use-cases | create order, update order, renew order, recompute pricing, delete order |
| Giữ pricing core làm chuẩn | không để local override logic giá quay trở lại |

## Quy tắc tìm file và search sau refactor

| Nhu cầu | Nơi cần tìm |
| --- | --- |
| Sửa UI Orders | `frontend/src/features/orders/pages` và `components` |
| Sửa API Orders | `frontend/src/features/orders/api` |
| Sửa business Orders backend | `backend/src/domains/orders/use-cases` |
| Sửa query Orders backend | `backend/src/domains/orders/repositories` |
| Sửa flow trình duyệt của Renew Adobe | `backend/src/domains/renew-adobe/adapters/browser` |
| Sửa formatter dùng chung | `frontend/src/shared/utils` hoặc `backend/src/shared/utils` |

Quy tắc search:

- muốn sửa domain nào thì search theo tên domain đó trước
- không để business rule nằm trong `helpers`, `index`, `page`, `controller` nếu có thể đưa vào use-case
- `index` chỉ nên export hoặc compose, không nên chứa file 700 đến 900 dòng logic

## Những việc không nên làm

- không big-bang rewrite toàn repo trong một đợt
- không đổi tên hàng loạt khi chưa chốt import strategy
- không tiếp tục nhét logic vào `lib/helpers.ts`, `api.ts`, `dbSchema.js`
- không tách file một cách máy móc chỉ vì số dòng
- không refactor đồng thời backend và frontend của cùng một domain nếu chưa có smoke test tối thiểu

## Tiêu chí nghiệm thu sau khi tinh gọn bộ máy

| Tiêu chí | Mục tiêu |
| --- | --- |
| Cấu trúc thư mục | toàn repo theo một chuẩn domain rõ ràng |
| Kích thước file | không còn page, modal, hook, controller vượt xa ngưỡng |
| Searchability | một domain tương ứng một cụm folder dễ tìm |
| Duplication | không còn route trùng, helper bucket, entry trùng vai trò |
| Onboarding | dev mới có thể xác định đúng nơi sửa trong 5 đến 10 phút |
| Safety | có smoke test cơ bản cho các flow chính trước mỗi phase tách lớn |

## Đề xuất cách triển khai thực tế

| Sprint | Mục tiêu |
| --- | --- |
| Sprint 1 | `P0` + `P1` |
| Sprint 2 | `P2` - Renew Adobe |
| Sprint 3 | `P3` - Product Pricing |
| Sprint 4 | `P4` - Package Products |
| Sprint 5 | `P5` - Orders |
| Sprint 6 | `P6` + `P7` |

## Kết luận

Hướng refactor tối ưu nhất cho repo này là:

1. **modular monolith theo business domain**
2. **giảm shared bucket, tăng domain-local modules**
3. **tách file theo trách nhiệm**
4. **triển khai theo phase, không big-bang**

Ba điểm bắt đầu có ROI cao nhất:

1. `renew-adobe`
2. `product-pricing`
3. `package-products`
