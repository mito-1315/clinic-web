import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { errMsg } from "../api";

export function Login() {
  const { user, ready, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (ready && user) return <Navigate to="/admin" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      nav("/admin", { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-5">
      <h1 className="text-2xl font-bold text-brand-700">Clinic admin</h1>
      <p className="mb-5 text-sm text-stone-600">Lakshmi Child Care Center · demo website</p>
      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pw">Password</label>
          <input id="pw" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <div className="mt-4 rounded-2xl bg-sun-100 p-4 text-sm">
        <p className="font-semibold">Demo account (fake data only)</p>
        <p className="mt-1">Email: <code>admin@demo.clinic</code></p>
        <p>Password: <code>Demo@12345</code></p>
        <button type="button" className="btn mt-3 min-h-10" onClick={() => { setEmail("admin@demo.clinic"); setPassword("Demo@12345"); }}>Fill demo login</button>
      </div>
    </main>
  );
}
