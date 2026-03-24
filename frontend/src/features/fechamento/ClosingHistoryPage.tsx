import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  IconConfiguracoes,
  IconCriativos,
  IconEntregasVsl,
  IconFechamento,
  IconHistorico,
  IconPerformance,
  IconQualidade,
  IconSair,
  IconValidacoes,
} from "../../components/sidebar/SidebarIcons";
import { apiRequest } from "../../lib/api";
import "../entregas/entregas.css";
import "./fechamento.css";

type ClosingHistoryRow = {
  id: string;
  month: string;
  status: "open" | "closed";
  closedAt: string;
  closedByUserId: string;
  totals: {
    totalSalaryCents: number;
    totalBonusCents: number;
    totalNetCents: number;
  };
};

function formatMonthLabel(ym: string) {
  const [yStr, mStr] = ym.split("-");
  const date = new Date(Number(yStr), Number(mStr) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date).toUpperCase();
}

function formatBRLFromCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default function ClosingHistoryPage(props: { onLogout: (reason?: string) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const token = localStorage.getItem("auth_token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ClosingHistoryRow[]>([]);

  useEffect(() => {
    if (!token) return;
    void apiRequest<ClosingHistoryRow[]>({
      apiUrl,
      path: "/closing/periods",
      token,
      onUnauthorized: () => props.onLogout("Sessao expirada. Faça login novamente."),
    })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar histórico de fechamentos"))
      .finally(() => setLoading(false));
  }, [apiUrl, props, token]);

  return (
    <div className="entregas-root">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-text">
            NITRO<span>HUB</span>
          </div>
          <div className="logo-sub">Editor Performance</div>
        </div>
        <div className="nav-section-block">
          <div className="nav-section-label">Principal</div>
          <div className={`nav-item ${location.pathname === "/performance" ? "active" : ""}`} onClick={() => navigate("/performance")}>
            <span className="nav-item-icon" aria-hidden="true">
              <IconPerformance />
            </span>
            <span className="nav-item-label">Performance</span>
          </div>
        </div>
        <div className="nav-section-block">
          <div className="nav-section-label">Operação</div>
          <div className="nav-item" onClick={() => navigate("/")}>
            <span className="nav-item-icon" aria-hidden="true">
              <IconEntregasVsl />
            </span>
            <span className="nav-item-label">Entregas VSL</span>
          </div>
          <div className="nav-item" onClick={() => navigate("/?tab=criativos")}>
            <span className="nav-item-icon" aria-hidden="true">
              <IconCriativos />
            </span>
            <span className="nav-item-label">Entrega Criativos</span>
          </div>
          <div className={`nav-item ${location.pathname === "/validacoes" ? "active" : ""}`} onClick={() => navigate("/validacoes")}>
            <span className="nav-item-icon" aria-hidden="true">
              <IconValidacoes />
            </span>
            <span className="nav-item-label">Validações</span>
          </div>
        </div>
        <div className="nav-section-block">
          <div className="nav-section-label">Qualidade</div>
          <div className="nav-item" onClick={() => navigate("/?tab=qualidade")}>
            <span className="nav-item-icon" aria-hidden="true">
              <IconQualidade />
            </span>
            <span className="nav-item-label">Qualidade Leva</span>
          </div>
        </div>
        <div className="nav-section-block">
          <div className="nav-section-label">Financeiro</div>
          <div className={`nav-item ${location.pathname === "/fechamento" ? "active" : ""}`} onClick={() => navigate("/fechamento")}>
            <span className="nav-item-icon" aria-hidden="true">
              <IconFechamento />
            </span>
            <span className="nav-item-label">Fechamento</span>
          </div>
          <div className={`nav-item ${location.pathname === "/fechamento/historico" ? "active" : ""}`} onClick={() => navigate("/fechamento/historico")}>
            <span className="nav-item-icon" aria-hidden="true">
              <IconHistorico />
            </span>
            <span className="nav-item-label">Histórico de Fechamentos</span>
          </div>
        </div>
        <div className="nav-section-block">
          <div className="nav-section-label">Gestão</div>
          <div className="nav-item" onClick={() => navigate("/?tab=configuracoes")}>
            <span className="nav-item-icon" aria-hidden="true">
              <IconConfiguracoes />
            </span>
            <span className="nav-item-label">Configurações</span>
          </div>
        </div>
        <button type="button" className="btn btn-ghost sidebar-logout-btn" onClick={() => props.onLogout()}>
          <span className="nav-item-icon" aria-hidden="true">
            <IconSair />
          </span>
          Sair
        </button>
      </aside>

      <main className="main fechamento-main">
        <div className="page-header">
          <div>
            <h1 className="page-title">Histórico de Fechamentos</h1>
            <p className="page-subtitle">Consulta de períodos fechados</p>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate("/fechamento")}>
            Voltar para Fechamento
          </button>
        </div>

        {error ? <div className="form-error">{error}</div> : null}

        <div className="table-wrap">
          <div className="table-header-row">
            <div>Mês</div>
            <div>Status</div>
            <div>Fechado em</div>
            <div>Folha</div>
            <div>Bônus</div>
            <div>Total Líquido</div>
          </div>
          {rows.map((row) => (
            <div
              key={row.id}
              className="table-row"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/fechamento?month=${encodeURIComponent(row.month)}`)}
            >
              <div>{formatMonthLabel(row.month)}</div>
              <div>
                <span className={`status-badge ${row.status === "closed" ? "sb-fixo" : "sb-pendente"}`}>
                  {row.status === "closed" ? "Fechado" : "Aberto"}
                </span>
              </div>
              <div>{new Date(row.closedAt).toLocaleDateString("pt-BR")}</div>
              <div>{formatBRLFromCents(row.totals.totalSalaryCents)}</div>
              <div>{formatBRLFromCents(row.totals.totalBonusCents)}</div>
              <div>{formatBRLFromCents(row.totals.totalNetCents)}</div>
            </div>
          ))}
          {!loading && rows.length === 0 ? <div className="criativos-empty">Nenhum fechamento encontrado.</div> : null}
        </div>
      </main>

      {loading ? <div className="loading-overlay">Carregando...</div> : null}
    </div>
  );
}

