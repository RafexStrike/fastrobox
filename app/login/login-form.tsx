"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <form action={action} className="login-form">
      <label className="field-label" htmlFor="username">
        Username or email
      </label>
      <input
        autoComplete="username"
        autoCapitalize="none"
        className="text-input"
        id="username"
        name="username"
        required
      />

      <label className="field-label" htmlFor="password">
        Password
      </label>
      <input
        autoComplete="current-password"
        className="text-input"
        id="password"
        name="password"
        required
        type="password"
      />

      {state.error && (
        <p className="form-error" id="login-error" role="alert">
          {state.error}
        </p>
      )}

      <button className="submit-button" disabled={pending} type="submit">
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}