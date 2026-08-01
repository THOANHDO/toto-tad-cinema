import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

interface Arguments {
  email: string;
  password: string;
  name: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readArguments(argv: string[]): Arguments {
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;

    const [rawKey, inlineValue] = argument.slice(2).split("=", 2);
    const nextValue = inlineValue ?? argv[index + 1];

    if (!inlineValue && nextValue && !nextValue.startsWith("--")) {
      index += 1;
    }

    if (nextValue) values.set(rawKey, nextValue);
  }

  return {
    email: (values.get("email") ?? "").trim().toLowerCase(),
    password: values.get("password") ?? "",
    name: (values.get("name") ?? "").trim(),
  };
}

function validateArguments({ email, password, name }: Arguments) {
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Email không hợp lệ.");
  }

  if (password.length < 12) {
    throw new Error("Mật khẩu tạm phải có ít nhất 12 ký tự.");
  }

  if (name.length < 1 || name.length > 80) {
    throw new Error("Tên người dùng phải có từ 1 đến 80 ký tự.");
  }
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong môi trường server/local.",
    );
  }

  const input = readArguments(process.argv.slice(2));
  validateArguments(input);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      display_name: input.name,
    },
  });

  if (error) {
    const normalizedMessage = error.message.toLowerCase();
    if (
      normalizedMessage.includes("already") ||
      normalizedMessage.includes("registered") ||
      normalizedMessage.includes("exists")
    ) {
      throw new Error("Tài khoản với email này đã tồn tại.");
    }

    throw new Error(`Không thể tạo tài khoản: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Supabase không trả về user sau khi tạo tài khoản.");
  }

  console.log(`Đã tạo tài khoản private cho ${input.email} (${data.user.id}).`);
  console.log("Mật khẩu không được ghi log. Hãy gửi thông tin đăng nhập qua kênh riêng.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Lỗi không xác định.";
  console.error(message);
  process.exitCode = 1;
});
