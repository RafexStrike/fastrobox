import Link from "next/link";
import { SignupForm } from "@/app/signup/signup-form";

export default function SignupPage() {
  return (
    <main className="login-screen">
      <div className="login-frame">
        <section className="login-content signup-content" aria-labelledby="signup-title">
          <Link className="wordmark" href="/login" aria-label="Fastrobox home">
            <span className="wordmark-mark" aria-hidden="true">F</span>
            <span>Fastrobox</span>
          </Link>
          <div className="login-intro">
            <p className="eyebrow">Learning workspace</p>
            <h1 id="signup-title">Create your account.</h1>
            <p className="login-subtitle">Join your learning community.</p>
          </div>
          <SignupForm />
          <p className="login-footnote">
            Already have an account? <Link href="/login">Sign in</Link>
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