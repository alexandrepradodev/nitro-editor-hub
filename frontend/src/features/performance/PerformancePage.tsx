import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { apiRequest } from "../../lib/api";
import "../entregas/entregas.css";
import "./performance.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

type Editor = { id: string; name: string; initials: string; colorClass: string; isActive: boolean };

type PerformanceResponse = {
  filters: { from: string; to: string; editorIds: string[]; types: string[] };
  kpis: {
    totalProduced: number;
    totalDeliveries: number;
    totalAds: number;
    totalValidations: number;
    avgQualityPercent: number;
    sectorCostCents: number;
    byDeliveryType: { VSL: number; Lead: number; ML: number; Troca: number; Upsell: number };
  };
  charts: {
    months: string[];
    monthlyCost: Array<{ month: string; totalCents: number }>;
    volumeByType: Record<string, number>;
    adsByEditorSeries: Array<{ editorId: string; editorName: string; initials: string; colorClass: string; data: number[] }>;
    qualityByEditorSeries: Array<{ editorId: string; editorName: string; initials: string; colorClass: string; data: number[] }>;
    noteDistribution: { n100: number; n80: number; n60: number; n40: number; n0: number };
    costBreakdown: { salariesCents: number; deliveryBonusCents: number; adBonusCents: number; qualityBonusCents: number };
  };
  rankings: {
    validations: Array<{ editorId: string; name: string; initials: string; colorClass: string; valueCents: number }>;
    quality: Array<{ editorId: string; name: string; initials: string; colorClass: string; avgQualityPercent: number }>;
  };
};

const typeOptions = ["VSL", "Lead", "ML", "Troca", "Upsell", "Criativos"] as const;

function formatBRLFromCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatMonthLabel(ym: string) {
  const [yStr, mStr] = ym.split("-");
  const date = new Date(Number(yStr), Number(mStr) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(date);
}

export default function PerformancePage(props: { onLogout: (reason?: string) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const token = localStorage.getItem("auth_token");
  const now = new Date();
  const start3m = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editors, setEditors] = useState<Editor[]>([]);
  const [selectedEditors, setSelectedEditors] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([...typeOptions]);
  const [fromDate, setFromDate] = useState(start3m);
  const [toDate, setToDate] = useState(today);
  const [data, setData] = useState<PerformanceResponse | null>(null);

  useEffect(() => {
    if (!token) return;
    void apiRequest<Editor[]>({
      apiUrl,
      path: "/editors",
      token,
      onUnauthorized: () => props.onLogout("Sessao expirada. Faça login novamente."),
    })
      .then((rows) => {
        const active = rows.filter((e) => e.isActive);
        setEditors(active);
        setSelectedEditors(active.map((e) => e.id));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar editores"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || selectedEditors.length === 0) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      from: fromDate,
      to: toDate,
      editorIds: selectedEditors.join(","),
      types: selectedTypes.join(","),
    });
    void apiRequest<PerformanceResponse>({
      apiUrl,
      path: `/performance/summary?${params.toString()}`,
      token,
      onUnauthorized: () => props.onLogout("Sessao expirada. Faça login novamente."),
    })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar performance"))
      .finally(() => setLoading(false));
  }, [apiUrl, fromDate, props, selectedEditors, selectedTypes, toDate, token]);

  const monthLabels = useMemo(() => (data?.charts.months ?? []).map(formatMonthLabel), [data]);

  return (
    <div className="entregas-root">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-text">NITRO<span>HUB</span></div>
          <div className="logo-sub">Editor Performance</div>
        </div>
        <div className="nav-section-block">
          <div className="nav-section-label">Principal</div>
          <div className={`nav-item ${location.pathname === "/performance" ? "active" : ""}`} onClick={() => navigate("/performance")}>Performance</div>
        </div>
        <div className="nav-section-block">
          <div className="nav-section-label">Operação</div>
          <div className="nav-item" onClick={() => navigate("/")}>Entregas VSL</div>
          <div className="nav-item" onClick={() => navigate("/?tab=criativos")}>Entrega Criativos</div>
          <div className={`nav-item ${location.pathname === "/validacoes" ? "active" : ""}`} onClick={() => navigate("/validacoes")}>Validações</div>
        </div>
        <div className="nav-section-block">
          <div className="nav-section-label">Qualidade</div>
          <div className="nav-item" onClick={() => navigate("/?tab=qualidade")}>Qualidade Leva</div>
        </div>
        <div className="nav-section-block">
          <div className="nav-section-label">Financeiro</div>
          <div className={`nav-item ${location.pathname === "/fechamento" ? "active" : ""}`} onClick={() => navigate("/fechamento")}>Fechamento</div>
          <div className={`nav-item ${location.pathname === "/fechamento/historico" ? "active" : ""}`} onClick={() => navigate("/fechamento/historico")}>Histórico de Fechamentos</div>
        </div>
        <div className="nav-section-block">
          <div className="nav-section-label">Gestão</div>
          <div className="nav-item" onClick={() => navigate("/?tab=configuracoes")}>Configurações</div>
        </div>
        <button type="button" className="btn btn-ghost sidebar-logout-btn" onClick={() => props.onLogout()}>Sair</button>
      </aside>

      <main className="main performance-main">
        <div className="page-header">
          <div>
            <h1 className="page-title">Performance</h1>
            <p className="page-subtitle">Análise cruzada de produção, qualidade e financeiro</p>
          </div>
        </div>

        <div className="performance-filters">
          <input className="filter-select" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input className="filter-select" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <div className="type-filters">
            {typeOptions.map((type) => (
              <button key={type} className={`type-filter-pill ${selectedTypes.includes(type) ? "on" : ""}`} onClick={() => setSelectedTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type])}>
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="type-filters" style={{ marginBottom: 16 }}>
          {editors.map((editor) => (
            <button key={editor.id} className={`type-filter-pill ${selectedEditors.includes(editor.id) ? "on" : ""}`} onClick={() => setSelectedEditors((prev) => prev.includes(editor.id) ? prev.filter((id) => id !== editor.id) : [...prev, editor.id])}>
              {editor.initials}
            </button>
          ))}
        </div>

        {error ? <div className="form-error">{error}</div> : null}

        <div className="summary-strip">
          <div className="sum-card"><div className="sum-label">Total Produzido</div><div className="sum-value cyan">{data?.kpis.totalProduced ?? 0}</div></div>
          <div className="sum-card"><div className="sum-label">VSL / Lead / ML / Troca / Upsell</div><div className="sum-value">{data?.kpis.totalDeliveries ?? 0}</div></div>
          <div className="sum-card"><div className="sum-label">ADs Criativos</div><div className="sum-value yellow">{data?.kpis.totalAds ?? 0}</div></div>
          <div className="sum-card"><div className="sum-label">Validações</div><div className="sum-value">{data?.kpis.totalValidations ?? 0}</div></div>
          <div className="sum-card"><div className="sum-label">Média Qualidade</div><div className="sum-value">{(data?.kpis.avgQualityPercent ?? 0).toFixed(1)}%</div></div>
          <div className="sum-card"><div className="sum-label">Custo Setor</div><div className="sum-value green">{formatBRLFromCents(data?.kpis.sectorCostCents ?? 0)}</div></div>
        </div>

        <div className="performance-grid-2">
          <div className="performance-card">
            <h3>Custo do Setor</h3>
            <Line
              data={{
                labels: monthLabels,
                datasets: [{ label: "Custo", data: (data?.charts.monthlyCost ?? []).map((m) => m.totalCents / 100), borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.2)" }],
              }}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
          <div className="performance-card">
            <h3>Volume por Tipo</h3>
            <Doughnut
              data={{
                labels: Object.keys(data?.charts.volumeByType ?? {}),
                datasets: [{ data: Object.values(data?.charts.volumeByType ?? {}), backgroundColor: ["#eab308", "#7c3aed", "#00e5ff", "#22c55e", "#f97316", "#ef4444"] }],
              }}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </div>

        <div className="performance-grid-1">
          <div className="performance-card">
            <h3>ADs por Editor</h3>
            <Bar
              data={{
                labels: monthLabels,
                datasets: (data?.charts.adsByEditorSeries ?? []).map((row) => ({
                  label: row.editorName,
                  data: row.data,
                })),
              }}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </div>

        <div className="performance-grid-2">
          <div className="performance-card">
            <h3>Qualidade por Editor</h3>
            <Line
              data={{
                labels: monthLabels,
                datasets: (data?.charts.qualityByEditorSeries ?? []).map((row) => ({
                  label: row.editorName,
                  data: row.data,
                })),
              }}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
          <div className="performance-card">
            <h3>Distribuição de Notas</h3>
            <Bar
              data={{
                labels: ["100%", "80%", "60%", "40%", "0%"],
                datasets: [{ data: data ? [data.charts.noteDistribution.n100, data.charts.noteDistribution.n80, data.charts.noteDistribution.n60, data.charts.noteDistribution.n40, data.charts.noteDistribution.n0] : [] }],
              }}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </div>

        <div className="performance-grid-2">
          <div className="performance-card">
            <h3>Ranking Validações</h3>
            {(data?.rankings.validations ?? []).map((row) => (
              <div key={row.editorId} className="perf-rank-row">
                <span>{row.initials}</span>
                <span>{row.name}</span>
                <strong>{formatBRLFromCents(row.valueCents)}</strong>
              </div>
            ))}
          </div>
          <div className="performance-card">
            <h3>Ranking Qualidade</h3>
            {(data?.rankings.quality ?? []).map((row) => (
              <div key={row.editorId} className="perf-rank-row">
                <span>{row.initials}</span>
                <span>{row.name}</span>
                <strong>{row.avgQualityPercent.toFixed(1)}%</strong>
              </div>
            ))}
          </div>
        </div>
      </main>
      {loading ? <div className="loading-overlay">Carregando...</div> : null}
    </div>
  );
}

