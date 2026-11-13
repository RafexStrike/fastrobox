import { LoginForm } from "@/app/login/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="login-screen">
      <div className="login-frame">
        <section className="login-content" aria-labelledby="login-title">
          <a className="wordmark" href="/login" aria-label="Fastrobox home">
            <span className="wordmark-mark" aria-hidden="true">F</span>
            <span>Fastrobox</span>
          </a>
          <div className="login-intro">
            <p className="eyebrow">Learning workspace</p>
            <h1 id="login-title">Welcome back.</h1>
            <p className="login-subtitle">Sign in to continue to your workspace.</p>
          </div>
          <LoginForm />
          <p className="login-footnote">
            New to Fastrobox? <Link href="/signup">Create an account</Link>
          </p>
        </section>
        <aside className="login-aside" aria-label="Fastrobox">
          <div className="aside-orbit" aria-hidden="true">
            <span className="orbit-core" />
            <span className="orbit-dot orbit-dot-one" />
            <span className="orbit-dot orbit-dot-two" />
          </div>
          <p className="aside-index">01 / LEARNING, TOGETHER</p>
          <h2>Make room for what comes next.</h2>
          <div className="aside-rule" />
          <p className="aside-caption">A shared space for the people who make learning matter.</p>
        </aside>
      </div>
    </main>
  );
}