import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./useAuth";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({
  getAuthToken: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides auth context", () => {
    vi.mocked(api.getAuthToken).mockReturnValue(null);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.signIn).toBeDefined();
    expect(result.current.signUp).toBeDefined();
    expect(result.current.signOut).toBeDefined();
  });

  it("handles sign in", async () => {
    vi.mocked(api.getAuthToken).mockReturnValue(null);
    vi.mocked(api.login).mockResolvedValue({
      user: { id: "123", email: "test@example.com" },
      token: "tok",
    } as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let signInResult: any;
    await act(async () => {
      signInResult = await result.current.signIn("test@example.com", "password");
    });

    expect(signInResult.error).toBeNull();
    expect(api.login).toHaveBeenCalledWith("test@example.com", "password");
  });
});
