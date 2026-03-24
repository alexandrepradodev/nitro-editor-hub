import { useEffect, useMemo, useState } from "react";
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

type ClosingEditorRow = {
  editorId: string;
  name: string;
  initials: string;
  role: string;
  colorClass: string;
  productionType: string | null;
  salaryCents: number;
  deliveryBonusCents: number;
  adBonusCents: number;
  qualityBonusCents: number;
  subtotalCents: number;
  netTotalCents: number;
};

type ClosingSummaryResponse = {
  month: string;
  periodStatus: "open" | "closed";
  pendingAlert: { pendingDeliveries: number; message: string };
  totals: {
    totalSalaryCents: number;
    totalBonusCents: number;
    totalNetCents: number;
  };
  checklist: {
    deliveriesCount: number;
    vslLeadMlUpsellCount: number;
    adCreativesCount: number;
    qualityBatchesCount: number;
  };
  editors: ClosingEditorRow[];
};

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

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

function toPtDateNow() {
  return new Date().toLocaleDateString("pt-BR");
}

export default function FechamentoPage(props: { onLogout: (reason?: string) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const token = localStorage.getItem("auth_token");

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<ClosingSummaryResponse | null>(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const monthFromQuery = params.get("month");
    if (monthFromQuery && /^\d{4}-\d{2}$/.test(monthFromQuery)) {
      setSelectedMonth(monthFromQuery);
    }
  }, [location.search]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>([selectedMonth, currentMonthKey()]);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [selectedMonth]);

  async function loadData(month: string) {
    if (!token) return;
    const response = await apiRequest<ClosingSummaryResponse>({
      apiUrl,
      path: `/closing/summary?month=${encodeURIComponent(month)}`,
      token,
      onUnauthorized: () => props.onLogout("Sessao expirada. Faça login novamente."),
    });
    setData(response);
  }

  useEffect(() => {
    setLoading(true);
    setError("");
    void loadData(selectedMonth)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar fechamento"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, token]);

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
        <div className="period-badge">
          <div className="period-label">Período atual</div>
          <div className="period-value">{formatMonthLabel(selectedMonth)}</div>
          <div className="period-status">
            <div className="dot-open" />
            <div className="status-text">{data?.periodStatus === "closed" ? "Fechado" : "Aberto"}</div>
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
            <h1 className="page-title">Fechamento</h1>
            <p className="page-subtitle">{formatMonthLabel(selectedMonth)} · Resumo financeiro do período</p>
          </div>
          <div className="header-actions">
            <select className="filter-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
            <button className="btn btn-ghost" onClick={() => navigate("/fechamento/historico")}>
              Histórico
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setExportError("");
                setExportModalOpen(true);
              }}
            >
              Exportar
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setCloseModalOpen(true)}
              disabled={data?.periodStatus === "closed"}
            >
              {data?.periodStatus === "closed" ? "Período Fechado" : "Fechar Período"}
            </button>
          </div>
        </div>

        {error ? <div className="form-error">{error}</div> : null}

        <div className={`status-banner ${data?.periodStatus === "closed" ? "closed" : "open"}`}>
          <div className={`sb-dot ${data?.periodStatus === "closed" ? "closed" : "open"}`} />
          <div>
            <div className="sb-text">
              {data?.periodStatus === "closed"
                ? "Período fechado — dados consolidados"
                : "Período em aberto — dados ainda podem ser alterados"}
            </div>
            <div className="sb-sub">
              {formatMonthLabel(selectedMonth)} · {data?.periodStatus === "closed" ? `fechado em ${toPtDateNow()}` : "aberto"}
            </div>
          </div>
        </div>

        <div className="summary-strip">
          <div className="sum-card">
            <div className="sum-label">Folha Total</div>
            <div className="sum-value">{formatBRLFromCents(data?.totals.totalSalaryCents ?? 0)}</div>
          </div>
          <div className="sum-card">
            <div className="sum-label">Total Bônus</div>
            <div className="sum-value cyan">{formatBRLFromCents(data?.totals.totalBonusCents ?? 0)}</div>
          </div>
          <div className="sum-card">
            <div className="sum-label">Total Líquido</div>
            <div className="sum-value green">{formatBRLFromCents(data?.totals.totalNetCents ?? 0)}</div>
          </div>
        </div>

        <div className="pending-alert">
          <span>{data?.pendingAlert.message ?? "Sem pendências no período"}</span>
        </div>

        <div className="fechamento-grid">
          {(data?.editors ?? []).map((row) => (
            <div key={row.editorId} className="fechamento-card">
              <div className="fechamento-card-head">
                <div className="fechamento-editor">
                  <span className={`mini-avatar ${row.colorClass}`}>{row.initials}</span>
                  <div>
                    <div className="fechamento-editor-name">{row.name}</div>
                    <div className="fechamento-editor-role">{row.role}{row.productionType ? ` · ${row.productionType}` : ""}</div>
                  </div>
                </div>
                <div className="fechamento-liquido">{formatBRLFromCents(row.netTotalCents)}</div>
              </div>
              <div className="fechamento-breakdown">
                <div><span>Salário fixo</span><strong>{formatBRLFromCents(row.salaryCents)}</strong></div>
                <div><span>VSL / Lead / ML / Upsell</span><strong>{formatBRLFromCents(row.deliveryBonusCents)}</strong></div>
                <div><span>Criativos ADs</span><strong>{formatBRLFromCents(row.adBonusCents)}</strong></div>
                <div><span>Qualidade / Validações</span><strong>{formatBRLFromCents(row.qualityBonusCents)}</strong></div>
                <div className="subtotal"><span>Subtotal</span><strong>{formatBRLFromCents(row.subtotalCents)}</strong></div>
                <div className="total"><span>Total Líquido</span><strong>{formatBRLFromCents(row.netTotalCents)}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <div className={`modal-overlay ${closeModalOpen ? "open" : ""}`} onClick={() => setCloseModalOpen(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">Fechar Período</h2>
          <p className="page-subtitle">Ao confirmar, os dados do mês serão consolidados e novas alterações serão bloqueadas.</p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setCloseModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                void apiRequest<ClosingSummaryResponse>({
                  apiUrl,
                  path: "/closing/close",
                  token,
                  onUnauthorized: () => props.onLogout("Sessao expirada. Faça login novamente."),
                  init: {
                    method: "POST",
                    body: JSON.stringify({ month: selectedMonth }),
                  },
                })
                  .then((response) => {
                    setData(response);
                    setCloseModalOpen(false);
                    setError("");
                  })
                  .catch((e) => {
                    setError(e instanceof Error ? e.message : "Erro ao fechar período");
                  });
              }}
            >
              Confirmar Fechamento
            </button>
          </div>
        </div>
      </div>

      <div
        className={`modal-overlay ${exportModalOpen ? "open" : ""}`}
        onClick={() => {
          if (!exportLoading) setExportModalOpen(false);
        }}
      >
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">Exportar Fechamento</h2>
          <p className="page-subtitle">
            Baixe a planilha .xlsx do período <strong>{formatMonthLabel(selectedMonth)}</strong> com o resumo financeiro por editor e
            o detalhe das entregas por gestor.
          </p>
          {exportError ? <div className="form-error">{exportError}</div> : null}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" disabled={exportLoading} onClick={() => setExportModalOpen(false)}>
              Fechar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={exportLoading || !token}
              onClick={() => {
                if (!token) {
                  setExportError("Sessão expirada. Faça login novamente.");
                  return;
                }
                setExportError("");
                setExportLoading(true);
                void (async () => {
                  try {
                    const url = `${apiUrl}/closing/export?month=${encodeURIComponent(selectedMonth)}`;
                    const res = await fetch(url, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (res.status === 401) {
                      props.onLogout("Sessão expirada. Faça login novamente.");
                      return;
                    }
                    if (!res.ok) {
                      const maybeJson = await res.json().catch(() => null);
                      const message = maybeJson?.message ? String(maybeJson.message) : `Erro ao exportar (${res.status})`;
                      setExportError(message);
                      return;
                    }
                    const blob = await res.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = objectUrl;
                    a.download = `fechamento_${selectedMonth}.xlsx`;
                    a.click();
                    URL.revokeObjectURL(objectUrl);
                    setExportModalOpen(false);
                  } catch (e) {
                    setExportError(e instanceof Error ? e.message : "Erro ao baixar planilha");
                  } finally {
                    setExportLoading(false);
                  }
                })();
              }}
            >
              {exportLoading ? "Gerando…" : "Baixar planilha (.xlsx)"}
            </button>
          </div>
        </div>
      </div>

      {loading ? <div className="loading-overlay">Carregando...</div> : null}
    </div>
  );
}
