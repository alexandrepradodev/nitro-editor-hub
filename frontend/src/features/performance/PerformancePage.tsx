import { useEffect, useMemo, useRef, useState } from "react";
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
import type { ChartOptions } from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
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

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const COLOR_CLASS_HEX: Record<string, string> = {
  "c-cyan": "#00e5ff",
  "c-violet": "#a78bfa",
  "c-yellow": "#eab308",
  "c-orange": "#f97316",
  "c-green": "#22c55e",
};

const FALLBACK_CHART_COLORS = ["#00e5ff", "#a78bfa", "#eab308", "#f97316", "#22c55e", "#f472b6"];

function chartColorForEditor(colorClass: string, index: number): { border: string; fill: string } {
  const hex = COLOR_CLASS_HEX[colorClass] ?? FALLBACK_CHART_COLORS[index % FALLBACK_CHART_COLORS.length];
  return { border: hex, fill: `${hex}33` };
}

function formatBRLFromCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatMonthLabel(ym: string) {
  const [yStr, mStr] = ym.split("-");
  const date = new Date(Number(yStr), Number(mStr) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(date);
}

function cartesianScales(): ChartOptions<"line">["scales"] {
  const tickAndGrid = {
    ticks: { color: "#94a3b8" },
    grid: { color: "rgba(148,163,184,0.12)" },
  };
  return {
    x: tickAndGrid,
    y: tickAndGrid,
  };
}

function buildLineChartOptions(): ChartOptions<"line"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#cbd5e1" } },
      tooltip: {
        bodyColor: "#e2e8f0",
        titleColor: "#f1f5f9",
        backgroundColor: "rgba(15,23,42,0.92)",
        borderColor: "rgba(148,163,184,0.3)",
        borderWidth: 1,
      },
    },
    scales: cartesianScales(),
  };
}

function buildBarChartOptions(): ChartOptions<"bar"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#cbd5e1" } },
      tooltip: {
        bodyColor: "#e2e8f0",
        titleColor: "#f1f5f9",
        backgroundColor: "rgba(15,23,42,0.92)",
        borderColor: "rgba(148,163,184,0.3)",
        borderWidth: 1,
      },
    },
    scales: cartesianScales(),
  };
}

function buildRadialChartOptions(): ChartOptions<"doughnut"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#cbd5e1" } },
      tooltip: {
        bodyColor: "#e2e8f0",
        titleColor: "#f1f5f9",
        backgroundColor: "rgba(15,23,42,0.92)",
        borderColor: "rgba(148,163,184,0.3)",
        borderWidth: 1,
      },
    },
  };
}

export default function PerformancePage(props: { onLogout: (reason?: string) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const token = localStorage.getItem("auth_token");
  const onLogoutRef = useRef(props.onLogout);
  onLogoutRef.current = props.onLogout;

  const now = new Date();
  const start3m = toIsoDateLocal(new Date(now.getFullYear(), now.getMonth() - 2, 1));
  const today = toIsoDateLocal(new Date());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editors, setEditors] = useState<Editor[]>([]);
  const [editorsReady, setEditorsReady] = useState(false);
  const [selectedEditors, setSelectedEditors] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([...typeOptions]);
  const [fromDate, setFromDate] = useState(start3m);
  const [toDate, setToDate] = useState(today);
  const [data, setData] = useState<PerformanceResponse | null>(null);

  const lineChartOptions = useMemo(() => buildLineChartOptions(), []);
  const barChartOptions = useMemo(() => buildBarChartOptions(), []);
  const doughnutChartOptions = useMemo(() => buildRadialChartOptions(), []);

  const selectedEditorsKey = selectedEditors.join(",");
  const selectedTypesKey = selectedTypes.join(",");

  useEffect(() => {
    if (!token) {
      setEditorsReady(true);
      return;
    }
    setEditorsReady(false);
    setError("");
    void apiRequest<Editor[]>({
      apiUrl,
      path: "/editors",
      token,
      onUnauthorized: () => onLogoutRef.current("Sessao expirada. Faça login novamente."),
    })
      .then((rows) => {
        const active = rows.filter((e) => e.isActive);
        setEditors(active);
        setSelectedEditors(active.map((e) => e.id));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar editores"))
      .finally(() => setEditorsReady(true));
  }, [apiUrl, token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (!editorsReady) {
      return;
    }
    if (selectedEditors.length === 0) {
      setLoading(false);
      setData(null);
      return;
    }

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
      onUnauthorized: () => onLogoutRef.current("Sessao expirada. Faça login novamente."),
    })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar performance"))
      .finally(() => setLoading(false));
  }, [apiUrl, editorsReady, fromDate, selectedEditorsKey, selectedTypesKey, toDate, token]);

  const monthLabels = useMemo(() => (data?.charts.months ?? []).map(formatMonthLabel), [data]);
  const hasChartMonths = (data?.charts.months ?? []).length > 0;
  const noEditorSelection = editorsReady && selectedEditors.length === 0;

  return (
    <div className="entregas-root">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-text">NITRO<span>HUB</span></div>
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

        {noEditorSelection ? (
          <div className="form-error performance-empty-hint">
            Nenhum editor ativo ou selecionado. Cadastre ou reative editores em Configurações, ou selecione pelo menos um editor acima.
          </div>
        ) : null}
        {error ? <div className="form-error">{error}</div> : null}
        {!noEditorSelection && data && !hasChartMonths && !loading ? (
          <div className="performance-empty-hint subtle">Sem dados agregados por mês neste período. Os cartões abaixo refletem o intervalo selecionado.</div>
        ) : null}

        <div className="summary-strip">
          <div className="sum-card"><div className="sum-label">Total Produzido</div><div className="sum-value cyan">{data?.kpis.totalProduced ?? 0}</div></div>
          <div className="sum-card"><div className="sum-label">VSL / Lead / ML / Troca / Upsell</div><div className="sum-value">{data?.kpis.totalDeliveries ?? 0}</div></div>
          <div className="sum-card"><div className="sum-label">ADs Criativos</div><div className="sum-value yellow">{data?.kpis.totalAds ?? 0}</div></div>
          <div className="sum-card"><div className="sum-label">Validações</div><div className="sum-value">{data?.kpis.totalValidations ?? 0}</div></div>
          <div className="sum-card"><div className="sum-label">Média Qualidade</div><div className="sum-value">{(data?.kpis.avgQualityPercent ?? 0).toFixed(1)}%</div></div>
          <div className="sum-card"><div className="sum-label">Custo Setor</div><div className="sum-value green">{formatBRLFromCents(data?.kpis.sectorCostCents ?? 0)}</div></div>
        </div>

        <div className="performance-grid-2">
          <div className="performance-card performance-chart-card">
            <h3>Custo do Setor</h3>
            <div className="performance-chart-wrap">
              <Line
                data={{
                  labels: monthLabels,
                  datasets: [{ label: "Custo (R$)", data: (data?.charts.monthlyCost ?? []).map((m) => m.totalCents / 100), borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.2)" }],
                }}
                options={lineChartOptions}
              />
            </div>
          </div>
          <div className="performance-card performance-chart-card">
            <h3>Volume por Tipo</h3>
            <div className="performance-chart-wrap">
              <Doughnut
                data={{
                  labels: Object.keys(data?.charts.volumeByType ?? {}),
                  datasets: [{ data: Object.values(data?.charts.volumeByType ?? {}), backgroundColor: ["#eab308", "#7c3aed", "#00e5ff", "#22c55e", "#f97316", "#ef4444"], borderColor: "rgba(15,23,42,0.6)", borderWidth: 1 }],
                }}
                options={doughnutChartOptions}
              />
            </div>
          </div>
        </div>

        <div className="performance-grid-1">
          <div className="performance-card performance-chart-card">
            <h3>ADs por Editor</h3>
            <div className="performance-chart-wrap performance-chart-wrap--tall">
              <Bar
                data={{
                  labels: monthLabels,
                  datasets: (data?.charts.adsByEditorSeries ?? []).map((row, idx) => {
                    const { border, fill } = chartColorForEditor(row.colorClass, idx);
                    return {
                      label: row.editorName,
                      data: row.data,
                      backgroundColor: fill,
                      borderColor: border,
                      borderWidth: 1,
                    };
                  }),
                }}
                options={barChartOptions}
              />
            </div>
          </div>
        </div>

        <div className="performance-grid-2">
          <div className="performance-card performance-chart-card">
            <h3>Qualidade por Editor</h3>
            <div className="performance-chart-wrap performance-chart-wrap--tall">
              <Line
                data={{
                  labels: monthLabels,
                  datasets: (data?.charts.qualityByEditorSeries ?? []).map((row, idx) => {
                    const { border, fill } = chartColorForEditor(row.colorClass, idx);
                    return {
                      label: row.editorName,
                      data: row.data,
                      borderColor: border,
                      backgroundColor: fill,
                      tension: 0.25,
                      fill: true,
                    };
                  }),
                }}
                options={lineChartOptions}
              />
            </div>
          </div>
          <div className="performance-card performance-chart-card">
            <h3>Distribuição de Notas</h3>
            <div className="performance-chart-wrap">
              <Bar
                data={{
                  labels: ["100%", "80%", "60%", "40%", "0%"],
                  datasets: [
                    {
                      label: "Lotes",
                      data: data ? [data.charts.noteDistribution.n100, data.charts.noteDistribution.n80, data.charts.noteDistribution.n60, data.charts.noteDistribution.n40, data.charts.noteDistribution.n0] : [],
                      backgroundColor: ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"],
                      borderColor: "rgba(148,163,184,0.25)",
                      borderWidth: 1,
                    },
                  ],
                }}
                options={barChartOptions}
              />
            </div>
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
