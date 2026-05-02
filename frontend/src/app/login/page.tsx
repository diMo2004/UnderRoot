"use client";

import { GoogleLogin } from "@react-oauth/google";
import { authAPI } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main style={{ padding: 24 }}>
      <h1>Login</h1>

      <GoogleLogin
        onSuccess={async (resp) => {
          const credential = resp.credential;
          if (!credential) return;

          const { data } = await authAPI.login(credential);
          localStorage.setItem("underroot_token", data.token);
          router.push("/");
        }}
        onError={() => console.error("Google login failed")}
      />
    </main>
  );
}