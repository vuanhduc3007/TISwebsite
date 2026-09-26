"use client";

import { useActionState } from "react";
import { loginAction, type AuthActionState } from "@/app/(admin)/admin/actions/auth";

const initialState: AuthActionState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return (
    <form action={action} className="admin-form">
      <label>
        <span>Email</span>
        <input name="email" type="email" autoComplete="username" maxLength={191} required autoFocus />
      </label>
      <label>
        <span>Mật khẩu</span>
        <input name="password" type="password" autoComplete="current-password" minLength={8} maxLength={256} required />
      </label>
      {state.error ? <p className="admin-error" role="alert">{state.error}</p> : null}
      <button className="admin-button admin-button-primary" type="submit" disabled={pending}>
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
