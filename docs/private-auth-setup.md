# Private invite-only authentication

Ứng dụng dùng Supabase Auth (email + mật khẩu riêng trong Supabase), không dùng mật khẩu Gmail và không có signup/OAuth công khai. Mỗi Auth user có đúng một record authorization trong `user_accounts`; ứng dụng không còn sử dụng viewing profile kiểu Netflix.

## 1. Chạy migration

Chạy theo thứ tự trong Supabase SQL Editor:

1. `packages/database/migrations/20260317_movie_management.sql`
2. `packages/database/migrations/20260801_private_invite_auth.sql`
3. `packages/database/migrations/20260801_auth_user_owned_movie_data.sql`

Hai migration private-auth:

- tạo và backfill `public.user_accounts` từ `auth.users` hiện có;
- tạo trigger `handle_new_private_user()` cho user được tạo sau này;
- mặc định mọi user mới là `member`, không đọc role từ client metadata;
- bật RLS trên account, favorite và watch history;
- gắn favorite/history mới với `auth.uid()` và chỉ cho active owner truy cập;
- khóa bảng `sr_profiles` legacy khỏi `anon` và `authenticated`;
- giữ nguyên dữ liệu viewing profile/favorite/watch history cũ thay vì xóa.

Vì schema cũ không liên kết viewing profile với Auth user, migration chỉ tự gán dữ liệu legacy khi database có đúng một account. Nếu có nhiều account, các row legacy chưa có `user_id` được giữ lại nhưng không ai có thể đọc qua RLS; admin cần ánh xạ thủ công nếu muốn phục hồi chúng.

Sau khi migration hoàn tất, tạo admin đầu tiên hoặc nâng một user có sẵn bằng SQL Editor:

```sql
update public.user_accounts
set role = 'admin'
where email = lower('admin@gmail.com');
```

Không thêm `role` vào form/client metadata để cấp quyền admin.

## 2. Cấu hình Supabase Dashboard bắt buộc

Chỉ bỏ nút signup khỏi UI là chưa đủ. Trong **Authentication → Sign In / Providers** (tên menu có thể thay đổi nhẹ):

1. Tắt **Allow new users to sign up**. Khi tắt, chỉ user hiện có mới đăng nhập được. Xem [Supabase Auth general configuration](https://supabase.com/docs/guides/auth/general-configuration).
2. Giữ Email provider để dùng email/password, nhưng tắt email signup nếu Dashboard hiển thị tùy chọn riêng.
3. Tắt **Allow anonymous sign-ins**.
4. Tắt Google và mọi social provider không sử dụng.
5. Trong **URL Configuration**, đặt **Site URL** thành `https://toto-tad-cinema.vercel.app`.
6. Chỉ thêm redirect URL cần thiết: `http://localhost:3000/**` cho local và `https://toto-tad-cinema.vercel.app/**` cho production. Hạn chế wildcard rộng ở production theo [Supabase redirect URL guidance](https://supabase.com/docs/guides/auth/redirect-urls).
7. Không đặt `SUPABASE_SERVICE_ROLE_KEY` trong Vercel/Cloudflare variables dành cho client và không bao giờ thêm tiền tố `NEXT_PUBLIC_`.

Ứng dụng hiện không dùng OAuth, magic link hay public password recovery. `/auth/callback` và `/auth/confirm` chỉ được dành chỗ trong proxy cho flow server-side có thể bổ sung sau này.

## 3. Cách 1 — tạo user trong Dashboard

1. Mở **Authentication → Users → Add user**.
2. Chọn tạo user mới bằng email/password (không chọn public invitation flow nếu không cần email link).
3. Nhập email do admin chọn và một mật khẩu tạm mạnh, duy nhất (khuyến nghị ít nhất 12 ký tự).
4. Bật **Auto Confirm User** để user đăng nhập ngay bằng mật khẩu tạm.
5. Có thể đặt metadata `display_name`; trigger chỉ dùng trường này làm tên hiển thị, không tin metadata `role`.
6. Gửi email + mật khẩu tạm qua kênh riêng. Không gửi chung trong nhóm/chat công khai.

`auth.admin.createUser()` không tự gửi confirmation email và hỗ trợ `email_confirm: true`; xem [Supabase Auth users documentation](https://supabase.com/docs/guides/auth/users).

## 4. Cách 2 — script local/server

Từ repository root:

```bash
cp .env.example .env.local
```

Điền file `.env.local` (đã được `.gitignore`):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Sau đó chạy:

```bash
pnpm create-private-user \
  --email user@gmail.com \
  --password "temporary-password-strong" \
  --name "Tên người dùng"
```

Script `scripts/create-private-user.ts`:

- chỉ chạy local/server và dùng Admin API;
- chuẩn hóa/validate email, yêu cầu mật khẩu tối thiểu 12 ký tự;
- auto-confirm user và gắn `display_name`;
- không ghi mật khẩu vào log;
- báo rõ email trùng;
- không nhận tham số role, nên user luôn được trigger tạo dưới role `member`.

Xóa `SUPABASE_SERVICE_ROLE_KEY` khỏi máy/CI không cần dùng sau khi tạo user. Secret này bypass RLS và không được import vào Next.js app.

## 5. Vô hiệu hóa, khóa và xóa user

Chặn ngay ở application/database layer:

```sql
update public.user_accounts
set is_active = false
where email = lower('user@gmail.com');
```

Request tiếp theo sẽ sign out session và đưa user về `/login?error=account_disabled`. Để mở lại:

```sql
update public.user_accounts
set is_active = true
where email = lower('user@gmail.com');
```

Nếu cần khóa cả Supabase Auth, dùng Dashboard ban user hoặc Admin API `updateUserById(userId, { ban_duration: '876000h' })`. Admin API chỉ được gọi server-side; xem [Supabase updateUserById reference](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid).

Để xóa vĩnh viễn, xóa user trong **Authentication → Users**. Row `user_accounts`, favorite và lịch sử thuộc account đó sẽ cascade theo `auth.users`. Các row viewing profile legacy không còn được ứng dụng sử dụng.

## 6. Reset mật khẩu do admin kiểm soát

Ứng dụng cố ý không có nút “Quên mật khẩu”. Admin có thể đặt mật khẩu mới bằng một script/server environment dùng service role:

```ts
await supabase.auth.admin.updateUserById(userId, {
  password: "new-strong-temporary-password",
});
```

Không chạy đoạn này trong browser và không gửi service-role key cho user. Supabase xác nhận `updateUserById` có thể cập nhật password trực tiếp ở server trong [tài liệu Admin API](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid).

## 7. Environment của web app

Tạo `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Web app không cần service-role key. Anon key được phép nằm ở browser vì RLS là lớp authorization bắt buộc.

## 8. Checklist kiểm thử bắt buộc

- [ ] Chưa login mở `/` → `/login?next=%2F`.
- [ ] Chưa login mở `/phim/test?from=home` → login và `next` giữ cả query.
- [ ] Sai password → ở lại login, chỉ thấy “Email hoặc mật khẩu không chính xác.”
- [ ] User active hợp lệ → login thành công và tới `/` hoặc `next` hợp lệ.
- [ ] User đã login mở `/login` → redirect `/`.
- [ ] `is_active = false` → session bị sign out và không vào trang protected.
- [ ] Member update `role` qua Supabase client/REST → RLS từ chối.
- [ ] Member update `is_active`, `user_id` hoặc email authorization → RLS từ chối.
- [ ] `/signup` và `/register` không có form, đều redirect `/login`.
- [ ] Không có Google/social/guest login trong UI.
- [ ] Sign out → xóa state favorite/history trong memory và về `/login`.
- [ ] Refresh protected page khi active → session được refresh và trang vẫn hoạt động.
- [ ] `/_next/*`, favicon, logo/ảnh/font không bị redirect.
- [ ] `next=https://evil.example` và `next=//evil.example` → bỏ qua, về `/`.
- [ ] `next=/phim/test` → dùng đúng internal path.
- [ ] `/profiles` → redirect `/`; không còn UI “Ai đang xem?” hay tạo profile.
- [ ] Hai account khác nhau không đọc/sửa được favorite hoặc history của nhau.
- [ ] `anon` không có quyền trên `user_accounts`, `sr_favorites`, `sr_watch_history` hoặc `sr_profiles`.
- [ ] Login ở viewport 320 px không overflow; label, focus, show/hide password dùng keyboard được.
- [ ] `pnpm --filter silent-ride lint`, `typecheck`, `build` đều thành công.

Automated test cho safe redirect chạy bằng:

```bash
pnpm test:auth
```
