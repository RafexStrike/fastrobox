"use client";

import { useActionState } from "react";
import { register, type RegistrationState } from "@/app/actions/auth";
import { userRoles } from "@/lib/roles";

const initialState: RegistrationState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(register, initialState);

  return (
    <form action={action} className="login-form signup-form">
      <label className="field-label" htmlFor="fullName">
        Full name
      </label>
      <input
        autoComplete="name"
        className="text-input"
        id="fullName"
        maxLength={100}
        name="fullName"
        required
        aria-invalid={Boolean(state.fieldErrors?.fullName)}
        aria-describedby={state.fieldErrors?.fullName ? "fullName-error" : undefined}
      />
      {state.fieldErrors?.fullName && (
        <p className="form-error" id="fullName-error" role="alert">
          {state.fieldErrors.fullName}
        </p>
      )}

      <label className="field-label" htmlFor="username">
        Username
      </label>
      <input
        autoComplete="username"
        autoCapitalize="none"
        className="text-input"
        id="username"
        maxLength={32}
        minLength={3}
        name="username"
        required
        aria-invalid={Boolean(state.fieldErrors?.username)}
        aria-describedby={state.fieldErrors?.username ? "username-error" : undefined}
      />
      {state.fieldErrors?.username && (
        <p className="form-error" id="username-error" role="alert">
          {state.fieldErrors.username}
        </p>
      )}

      <label className="field-label" htmlFor="email">
        Email
      </label>
      <input
        autoComplete="email"
        autoCapitalize="none"
        className="text-input"
        id="email"
        maxLength={254}
        name="email"
        required
        type="email"
        aria-invalid={Boolean(state.fieldErrors?.email)}
        aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
      />
      {state.fieldErrors?.email && (
        <p className="form-error" id="email-error" role="alert">
          {state.fieldErrors.email}
        </p>
      )}

      <label className="field-label" htmlFor="password">
        Password
      </label>
      <input
        autoComplete="new-password"
        className="text-input"
        id="password"
        minLength={8}
        name="password"
        required
        type="password"
        aria-invalid={Boolean(state.fieldErrors?.password)}
        aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
      />
      {state.fieldErrors?.password && (
        <p className="form-error" id="password-error" role="alert">
          {state.fieldErrors.password}
        </p>
      )}

      <label className="field-label" htmlFor="confirmPassword">
        Confirm password
      </label>
      <input
        autoComplete="new-password"
        className="text-input"
        id="confirmPassword"
        name="confirmPassword"
        required
        type="password"
        aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
        aria-describedby={
          state.fieldErrors?.confirmPassword ? "confirmPassword-error" : undefined
        }
      />
      {state.fieldErrors?.confirmPassword && (
        <p className="form-error" id="confirmPassword-error" role="alert">
          {state.fieldErrors.confirmPassword}
        </p>
      )}

      <fieldset
        className="role-fieldset"
        aria-invalid={Boolean(state.fieldErrors?.role)}
        aria-describedby={state.fieldErrors?.role ? "role-error" : undefined}
      >
        <legend className="field-label">Role</legend>
        <div className="role-options">
          {userRoles.map((role) => (
            <label className="role-choice" key={role}>
              <input name="role" required type="radio" value={role} />
              <span>{role}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {state.fieldErrors?.role && (
        <p className="form-error" id="role-error" role="alert">
          {state.fieldErrors.role}
        </p>
      )}

      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}

      <button className="submit-button" disabled={pending} type="submit">
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}