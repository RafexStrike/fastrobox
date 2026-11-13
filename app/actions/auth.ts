"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { authenticateUser, registerUser } from "@/lib/users";
import { getDefaultDashboardPath, isSelfRegisterableRole, isUserRole } from "@/lib/roles";

export type LoginState = { error?: string };
type RegistrationField =
  | "fullName"
  | "username"
  | "email"
  | "password"
  | "confirmPassword"
  | "role";
export type RegistrationState = {
  fieldErrors?: Partial<Record<RegistrationField, string>>;
  error?: string;
};

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = formData.get("username");
  const password = formData.get("password");

  if (typeof username !== "string" || typeof password !== "string") {
    return { error: "The username or password is incorrect, or the account is temporarily locked." };
  }

  const authenticatedUser = await authenticateUser(username, password);
  if (!authenticatedUser) {
    return { error: "The username or password is incorrect, or the account is temporarily locked." };
  }

  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo: getDefaultDashboardPath(authenticatedUser.role),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "The username or password is incorrect, or the account is temporarily locked." };
    }
    throw error;
  }

  return {};
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export async function register(
  _previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const fullName = formData.get("fullName");
  const username = formData.get("username");
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const role = formData.get("role");
  const validRole = isUserRole(role) ? role : undefined;
  const allowedRole = validRole && isSelfRegisterableRole(validRole) ? validRole : undefined;
  const fieldErrors: RegistrationState["fieldErrors"] = {};

  if (typeof fullName !== "string" || !fullName.trim() || fullName.trim().length > 100) {
    fieldErrors.fullName = "Enter your full name (up to 100 characters).";
  }
  if (
    typeof username !== "string" ||
    !/^[a-zA-Z0-9._-]{3,32}$/.test(username.trim())
  ) {
    fieldErrors.username = "Use 3-32 letters, numbers, dots, underscores, or hyphens.";
  }
  if (
    typeof email !== "string" ||
    email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    fieldErrors.email = "Enter a valid email address.";
  }
  if (
    typeof password !== "string" ||
    Array.from(password).length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    fieldErrors.password = "Use at least 8 characters and no more than 72 UTF-8 bytes.";
  }
  if (typeof confirmPassword !== "string" || confirmPassword !== password) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }
  if (!validRole) {
    fieldErrors.role = "Choose one of the available roles.";
  }
  if (validRole && !allowedRole) {
    fieldErrors.role = "Public registration is restricted. Please ask an administrator to create this account.";
  }

  if (Object.keys(fieldErrors).length > 0 || !allowedRole) {
    return { fieldErrors };
  }

  const normalizedUsername = (username as string).trim();
  const normalizedEmail = (email as string).trim().toLowerCase();
  let result;

  try {
    result = await registerUser({
      fullName: (fullName as string).trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password: password as string,
      role: allowedRole,
    });
  } catch {
    return { error: "We couldn't create your account right now. Please try again." };
  }

  if (!result.created) {
    const duplicateErrors: RegistrationState["fieldErrors"] = {};
    if (result.usernameTaken) {
      duplicateErrors.username = "That username is already registered.";
    }
    if (result.emailTaken) {
      duplicateErrors.email = "That email address is already registered.";
    }
    return { fieldErrors: duplicateErrors };
  }

  try {
    await signIn("credentials", {
      username: normalizedUsername,
      password: password as string,
      redirectTo: getDefaultDashboardPath(allowedRole),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "Your account was created, but automatic sign-in failed. Please sign in.",
      };
    }
    throw error;
  }

  return {};
}