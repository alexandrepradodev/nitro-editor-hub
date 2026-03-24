import { Suspense, lazy, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import EntregasPage from "./features/entregas/EntregasPage";
import ValidacoesPage from "./features/validacoes/ValidacoesPage";
import FechamentoPage from "./features/fechamento/FechamentoPage";
import ClosingHistoryPage from "./features/fechamento/ClosingHistoryPage";
import "./App.css";

const PerformancePage = lazy(() => import("./features/performance/PerformancePage"));

function App() {
  const apiUrl = useMemo(() => import.meta.env.VITE_API_URL || "http://localhost:3001", []);
  const [token, setToken] = useState<string | null>(localStorage.getItem("auth_token"));
  const [email, setEmail] = useState("admin@nitrohub.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [authNotice, setAuthNotice] = useState("");

  const onLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError("Login invalido");
        return;
      }

      const data = (await response.json()) as { token: string };
      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      setAuthNotice("");
    } catch (err) {
      console.error(err);
      setError("Erro ao fazer login. Tente novamente.");
    }
  };

  const onLogout = (reason?: string) => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setAuthNotice(reason ?? "");
  };

  if (!token) {
    return (
      <main className="login-shell">
        <form className="login-card" onSubmit={onLogin}>
          <h1>Nitro Hub</h1>
          <p>Login de acesso ao sistema</p>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </label>
          <label>
            Senha
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </label>
          {error && <span className="login-error">{error}</span>}
          {authNotice && <span className="login-error">{authNotice}</span>}
          <button type="submit">Entrar</button>
        </form>
      </main>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Suspense fallback={<div className="loading-overlay">Carregando...</div>}>
          <Routes>
            <Route path="/" element={<EntregasPage onLogout={onLogout} />} />
            <Route path="/validacoes" element={<ValidacoesPage onLogout={onLogout} />} />
            <Route path="/fechamento" element={<FechamentoPage onLogout={onLogout} />} />
            <Route path="/fechamento/historico" element={<ClosingHistoryPage onLogout={onLogout} />} />
            <Route path="/performance" element={<PerformancePage onLogout={onLogout} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}

export default App
