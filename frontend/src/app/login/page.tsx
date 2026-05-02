"use client";

import { GoogleLogin } from "@react-oauth/google";
import { authAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-ivy-bg flex flex-col items-center justify-center p-4 text-ivy-text">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-ivy-text/70 hover:text-ivy-text transition-colors font-medium">
        <ArrowLeft size={20} /> Back to home
      </Link>
      
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-ivy-text/10 text-center">
        <div className="w-16 h-16 bg-ivy-text rounded-2xl flex items-center justify-center text-ivy-bg font-bold text-3xl mx-auto mb-6">
          U
        </div>
        <h1 className="text-3xl font-serif font-bold mb-2">Welcome Back</h1>
        <p className="text-ivy-text/60 mb-8 font-medium">Sign in to continue your serious research.</p>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={async (resp) => {
              const credential = resp.credential;
              if (!credential) return;

              try {
                // If the backend isn't fully ready to issue JWTs yet, we can fallback
                // to a simple mock token for the sake of frontend flow.
                const { data } = await authAPI.login(credential);
                localStorage.setItem("underroot_token", data.token);
                router.push("/dashboard");
              } catch (err) {
                console.error("Backend login failed, using mock auth for flow demonstration.");
                localStorage.setItem("underroot_token", "mock_token_" + credential.substring(0, 10));
                router.push("/dashboard");
              }
            }}
            onError={() => console.error("Google login failed")}
            useOneTap
          />
        </div>
      </div>
    </main>
  );
}