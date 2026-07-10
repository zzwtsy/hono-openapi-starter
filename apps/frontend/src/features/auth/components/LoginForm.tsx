import type { FormEvent } from "react";
import { useState } from "react";
import { useLogin } from "../hooks";

export function LoginForm() {
  const { login } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    }
  };

  return (
    <form onSubmit={e => void onSubmit(e)} className="flex flex-col gap-2 p-6">
      <input
        type="email"
        placeholder="邮箱"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="密码"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button type="submit">登录</button>
      {error != null && <p className="text-red-500">{error}</p>}
    </form>
  );
}
