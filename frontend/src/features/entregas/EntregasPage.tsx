import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./entregas.css";
import type { DeliveryStatus, DeliveryType, Editor } from "./mockData";
import CriativosAdsPage from "../criativos/CriativosAdsPage";
import ConfiguracoesPage from "../configuracoes/ConfiguracoesPage";
import QualidadeLevaPage from "../qualidade/QualidadeLevaPage";
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
import { useLocation, useNavigate } from "react-router-dom";

type Delivery = {
  id: string;
  title: string;
  taskId?: string | null;
  type: DeliveryType;
  editorIds: string[];
  date: string;
  retrabalho?: number | null;
  qualidade?: number | null;
  prazo?: number | null;
  kpiTotal: number | null;
  baseValueSnapshot?: number;
  isManualValue?: boolean;
  bonus: number;
  editorBonuses?: Array<{ editorId: string; bonusCents: number }>;
  status: DeliveryStatus;
  tierLabel?: string | null;
};

type Summary = {
  total: number;
  vsl: number;
  leadMl: number;
  troca: number;
  upsell: number;
  pending: number;
};

type NewDeliveryForm = {
  title: string;
  type: "" | DeliveryType;
  date: string;
  taskId: string;
  editorIds: string[];
  retrabalho: string;
  qualidade: string;
  prazo: string;
  bonusManual: string;
};

const typeOptions: Array<"all" | DeliveryType> = ["all", "VSL", "Lead", "ML", "Troca", "Upsell"];

function toPtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatBRLFromCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatCentsToPtBR(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function parsePtBRMoneyToCents(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const cleaned = s.replace(/[^\d.,]/g, "");
  if (!cleaned || !/\d/.test(cleaned)) return null;
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const asNumber = Number(normalized);
  if (!Number.isFinite(asNumber)) return null;
  return Math.round(asNumber * 100);
}

function getKpiTier(total: number) {
  if (total >= 24) return { pct: 1, label: "Tier 100%" };
  if (total >= 21) return { pct: 0.8, label: "Tier 80%" };
  if (total >= 18) return { pct: 0.6, label: "Tier 60%" };
  if (total >= 15) return { pct: 0.4, label: "Tier 40%" };
  return { pct: 0, label: "< 15pts" };
}

function formatMonthLabel(ym: string) {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const date = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
    .format(date)
    .toUpperCase();
}

function getDisplayBonusForSelectedEditor(row: Delivery, selectedEditorId: string) {
  if (!row.editorBonuses || row.editorBonuses.length === 0) return row.bonus;
  if (!selectedEditorId) {
    // Sem filtro de editor, mantém valor total para não confundir soma da linha.
    return row.bonus;
  }
  const selectedBonus = row.editorBonuses.find((item) => item.editorId === selectedEditorId)?.bonusCents;
  return typeof selectedBonus === "number" ? selectedBonus : row.bonus;
}

export default function EntregasPage(props: { onLogout: (reason?: string) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const token = localStorage.getItem("auth_token");
  const todayIso = useMemo(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${mm}-${dd}`;
  }, []);

  const periodValue = useMemo(() => {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(now);
    return formatted.toUpperCase();
  }, []);

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${mm}`;
  }, []);

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [editors, setEditors] = useState<Editor[]>([]);
  const [rates, setRates] = useState<Record<DeliveryType, number>>({
    VSL: 33000,
    Lead: 19000,
    ML: 16000,
    Troca: 18000,
    Upsell: 14000,
  });
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    vsl: 0,
    leadMl: 0,
    troca: 0,
    upsell: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | DeliveryType>("all");
  const [selectedEditor, setSelectedEditor] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => currentMonthKey);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<Delivery | null>(null);
  const [activeTab, setActiveTab] = useState<"entregas" | "criativos" | "qualidade" | "configuracoes">("entregas");
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "criativos" || tab === "qualidade" || tab === "configuracoes" || tab === "entregas") {
      setActiveTab(tab);
    } else {
      setActiveTab("entregas");
    }
  }, [location.search]);

  function setTabAndUrl(tab: "entregas" | "criativos" | "qualidade" | "configuracoes") {
    setActiveTab(tab);
    const params = new URLSearchParams(location.search);
    if (tab === "entregas") params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    navigate(`/${query ? `?${query}` : ""}`, { replace: false });
  }

  const [formError, setFormError] = useState<string>("");
  const [pageError, setPageError] = useState<string>("");
  const [form, setForm] = useState<NewDeliveryForm>({
    title: "",
    type: "",
    date: todayIso,
    taskId: "",
    editorIds: [],
    retrabalho: "",
    qualidade: "",
    prazo: "",
    bonusManual: "",
  });

  const filtered = useMemo(() => {
    return deliveries.filter((item) => {
      const matchType = selectedType === "all" || item.type === selectedType;
      const matchEditor = !selectedEditor || item.editorIds.includes(selectedEditor);
      const itemMonth = item.date.slice(0, 7); // YYYY-MM
      const matchMonth = !selectedMonth || itemMonth === selectedMonth;
      const searchText = `${item.taskId ?? ""} ${item.type}`.toLowerCase();
      const titleText = item.title.toLowerCase();
      const matchSearch = !search || searchText.includes(search.toLowerCase()) || titleText.includes(search.toLowerCase());
      return matchType && matchEditor && matchMonth && matchSearch;
    });
  }, [deliveries, search, selectedType, selectedEditor, selectedMonth]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const d of deliveries) set.add(d.date.slice(0, 7));
    set.add(currentMonthKey);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [deliveries, currentMonthKey]);

  const activeEditors = useMemo(() => editors.filter((editor) => editor.isActive), [editors]);

  const kpiNumbers = useMemo(() => {
    const r = Number(form.retrabalho);
    const q = Number(form.qualidade);
    const p = Number(form.prazo);
    const hasAll = [form.retrabalho, form.qualidade, form.prazo].every(Boolean);
    const total = (Number.isNaN(r) ? 0 : r) + (Number.isNaN(q) ? 0 : q) + (Number.isNaN(p) ? 0 : p);
    return { hasAll, total };
  }, [form.retrabalho, form.qualidade, form.prazo]);

  const bonusPreview = useMemo(() => {
    const parsedManual = parsePtBRMoneyToCents(form.bonusManual);
    if (parsedManual != null) return { text: formatBRLFromCents(parsedManual), note: "Valor manual" };
    if (!form.type) return { text: "R$ -", note: "Selecione tipo e KPI" };
    if (form.type === "Upsell") return { text: formatBRLFromCents(rates.Upsell), note: "Valor fixo - sem KPI" };
    const baseCents = rates[form.type];
    if (!kpiNumbers.hasAll) return { text: formatBRLFromCents(baseCents), note: "Fallback maximo" };
    const tier = getKpiTier(kpiNumbers.total);
    return { text: formatBRLFromCents(Math.round(baseCents * tier.pct)), note: tier.label };
  }, [form.type, form.bonusManual, kpiNumbers, rates]);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    try {
      setPageError("");
      const [deliveriesData, editorsData, summaryData, ratesData] = await Promise.all([
        apiRequest<Delivery[]>({ apiUrl, path: "/deliveries", token, onUnauthorized: () => props.onLogout("Sessao expirada. Faça login novamente.") }),
        apiRequest<Editor[]>({ apiUrl, path: "/editors", token, onUnauthorized: () => props.onLogout("Sessao expirada. Faça login novamente.") }),
        apiRequest<Summary>({ apiUrl, path: "/deliveries/summary", token, onUnauthorized: () => props.onLogout("Sessao expirada. Faça login novamente.") }),
        apiRequest<Array<{ type: DeliveryType; baseValue: number }>>({ apiUrl, path: "/rates", token, onUnauthorized: () => props.onLogout("Sessao expirada. Faça login novamente.") }),
      ]);

      const mappedRates = ratesData.reduce(
        (acc, item) => ({ ...acc, [item.type]: item.baseValue }),
        rates
      );

      setDeliveries(deliveriesData);
      setEditors(editorsData);
      setSummary(summaryData);
      setRates(mappedRates);
      const firstActiveEditor = editorsData.find((editor) => editor.isActive);
      if (firstActiveEditor) {
        setForm((prev) => ({ ...prev, editorIds: prev.editorIds.length ? prev.editorIds : [firstActiveEditor.id] }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar dados";
      setPageError(message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openKpi = (row: Delivery) => {
    setCreateOpen(false);
    setEditingDeliveryId(null);
    setSelectedRow(row);
  };

  const openCreateModal = () => {
    const firstActiveEditorId = activeEditors[0]?.id;
    setEditingDeliveryId(null);
    setFormError("");
    setForm({
      title: "",
      type: "",
      date: todayIso,
      taskId: "",
      editorIds: firstActiveEditorId ? [firstActiveEditorId] : [],
      retrabalho: "",
      qualidade: "",
      prazo: "",
      bonusManual: "",
    });
    setCreateOpen(true);
  };

  const openEditModal = (row: Delivery) => {
    const activeEditorIdsSet = new Set(activeEditors.map((editor) => editor.id));
    const nextEditorIds = row.editorIds.filter((editorId) => activeEditorIdsSet.has(editorId));
    setEditingDeliveryId(row.id);
    setFormError(
      nextEditorIds.length !== row.editorIds.length
        ? "Um ou mais editores desta entrega estão inativos. Selecione editores ativos para salvar."
        : ""
    );
    setForm({
      title: row.title,
      type: row.type,
      // Padrão para o usuário editar: data de hoje
      date: todayIso,
      taskId: row.taskId ?? "",
      editorIds: nextEditorIds,
      retrabalho: row.retrabalho?.toString() ?? "",
      qualidade: row.qualidade?.toString() ?? "",
      prazo: row.prazo?.toString() ?? "",
      bonusManual: formatCentsToPtBR(row.bonus),
    });
    setCreateOpen(true);
  };

  const deleteDeliveryById = async (id: string) => {
    const confirmed = window.confirm("Deseja realmente excluir esta entrega?");
    if (!confirmed) return;
    try {
      setPageError("");
      await apiRequest<void>({
        apiUrl,
        path: `/deliveries/${id}`,
        token,
        onUnauthorized: () => props.onLogout("Sessao expirada. Faça login novamente."),
        init: { method: "DELETE" },
      });
      if (selectedRow?.id === id) setSelectedRow(null);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao excluir entrega";
      setPageError(message);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!token) {
      setFormError("Sessao expirada. Faça login novamente.");
      return;
    }

    if (!form.type) {
      setFormError("Selecione o tipo.");
      return;
    }

    if (!form.title.trim()) {
      setFormError("Informe o titulo do material.");
      return;
    }

    if (form.editorIds.length === 0) {
      setFormError("Selecione pelo menos um editor.");
      return;
    }

    const hasKpi = form.type !== "Upsell" && kpiNumbers.hasAll;
    const bonusManualRaw = form.bonusManual.trim();
    const bonusManualParsed = bonusManualRaw ? parsePtBRMoneyToCents(bonusManualRaw) : null;
    if (bonusManualRaw && bonusManualParsed == null) {
      setFormError("Valor manual inválido. Ex: 1.230,90");
      return;
    }
    const payload = {
      title: form.title,
      taskId: form.taskId || undefined,
      type: form.type,
      date: form.date,
      editorIds: form.editorIds,
      retrabalho: hasKpi ? Number(form.retrabalho) : undefined,
      qualidade: hasKpi ? Number(form.qualidade) : undefined,
      prazo: hasKpi ? Number(form.prazo) : undefined,
      bonusManual: bonusManualParsed ?? undefined,
    };

    const method = editingDeliveryId ? "PATCH" : "POST";
    const path = editingDeliveryId ? `/deliveries/${editingDeliveryId}` : "/deliveries";

    try {
      await apiRequest<Delivery>({
        apiUrl,
        path,
        token,
        onUnauthorized: () => props.onLogout("Sessao expirada. Faça login novamente."),
        init: {
          method,
          body: JSON.stringify(payload),
        },
      });

      setCreateOpen(false);
      setEditingDeliveryId(null);
      setForm({
        title: "",
        type: "",
        date: todayIso,
        taskId: "",
        editorIds: activeEditors[0] ? [activeEditors[0].id] : [],
        retrabalho: "",
        qualidade: "",
        prazo: "",
        bonusManual: "",
      });
      void loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar entrega";
      setFormError(message);
    }
  };

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
          <div
            className={`nav-item ${activeTab === "entregas" ? "active" : ""}`}
            onClick={() => setTabAndUrl("entregas")}
          >
            <span className="nav-item-icon" aria-hidden="true">
              <IconEntregasVsl />
            </span>
            <span className="nav-item-label">Entregas VSL</span>
          </div>
          <div
            className={`nav-item ${activeTab === "criativos" ? "active" : ""}`}
            onClick={() => setTabAndUrl("criativos")}
          >
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
          <div
            className={`nav-item ${activeTab === "qualidade" ? "active" : ""}`}
            onClick={() => setTabAndUrl("qualidade")}
          >
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
          <div
            className={`nav-item ${activeTab === "configuracoes" ? "active" : ""}`}
            onClick={() => setTabAndUrl("configuracoes")}
          >
            <span className="nav-item-icon" aria-hidden="true">
              <IconConfiguracoes />
            </span>
            <span className="nav-item-label">Configurações</span>
          </div>
        </div>

        <div className="period-badge">
          <div className="period-label">Período atual</div>
          <div className="period-value">{periodValue}</div>
          <div className="period-status">
            <div className="dot-open" />
            <div className="status-text">Aberto</div>
          </div>
        </div>
        <button type="button" className="btn btn-ghost sidebar-logout-btn" onClick={() => props.onLogout()}>
          <span className="nav-item-icon" aria-hidden="true">
            <IconSair />
          </span>
          Sair
        </button>
      </aside>

      {activeTab === "entregas" ? (
        <main className="main">
          <div className="page-header">
            <div>
              <h1 className="page-title">Entregas VSL</h1>
              <p className="page-subtitle">VSL - Lead - ML - Troca - Upsell</p>
            </div>
            <button className="btn btn-primary" onClick={openCreateModal}>+ Nova Entrega</button>
          </div>

          <div className="summary-strip">
            <div className="sum-card"><div className="sum-label">Total Entregas</div><div className="sum-value cyan">{summary.total}</div></div>
            <div className="sum-card"><div className="sum-label">VSL</div><div className="sum-value">{summary.vsl}</div></div>
            <div className="sum-card"><div className="sum-label">Lead / ML</div><div className="sum-value">{summary.leadMl}</div></div>
            <div className="sum-card"><div className="sum-label">Troca</div><div className="sum-value">{summary.troca}</div></div>
            <div className="sum-card"><div className="sum-label">Upsell</div><div className="sum-value">{summary.upsell}</div></div>
            <div className="sum-card"><div className="sum-label">Pendentes KPI</div><div className="sum-value yellow">{summary.pending}</div></div>
          </div>

          <div className="filters-row">
            <select className="filter-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="">Todos os meses</option>
              {monthOptions.map((ym) => (
                <option key={ym} value={ym}>
                  {formatMonthLabel(ym)}
                </option>
              ))}
            </select>
            <select className="filter-select" value={selectedEditor} onChange={(e) => setSelectedEditor(e.target.value)}>
              <option value="">Todos os Editores</option>
              {editors.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <input className="search-input" placeholder="Buscar por titulo, Task ID ou tipo..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="records-count">{filtered.length} registros</div>
          </div>

          {pageError && <div className="form-error">{pageError}</div>}

          <div className="type-filters">
            {typeOptions.map((t) => (
              <button key={t} className={`type-filter-pill ${selectedType === t ? "on" : ""}`} onClick={() => setSelectedType(t)}>
                {t === "all" ? "Todos" : t}
              </button>
            ))}
          </div>

          <div className="table-wrap">
            <div className="table-header-row">
              <div>#</div><div>Tipo</div><div>Titulo</div><div>Editor(es)</div><div>Data</div><div>KPI</div><div>Bônus</div><div>Status</div><div></div>
            </div>
            {filtered.map((row, idx) => (
              <div key={row.id} className="table-row" onClick={() => openKpi(row)}>
                <div className="row-num">{String(idx + 1).padStart(2, "0")}</div>
                <div><span className={`type-pill tp-${row.type.toLowerCase()}`}>{row.type}</span></div>
                <div className="title-cell">{row.title}</div>
                <div className="editors-cell">
                  {row.editorIds.map((id) => {
                    const editor = editors.find((e) => e.id === id);
                    if (!editor) return null;
                    return <div key={id} className={`mini-avatar ${editor.colorClass}`}>{editor.initials}</div>;
                  })}
                </div>
                <div className="td-date">{toPtDate(row.date)}</div>
                <div className="kpi-cell">{row.kpiTotal == null ? "-" : `${row.kpiTotal}/30`}</div>
                <div className="bonus-cell">{formatBRLFromCents(getDisplayBonusForSelectedEditor(row, selectedEditor))}</div>
                <div><span className={`status-badge sb-${row.status.toLowerCase()}`}>{row.status}</span></div>
                <div className="row-actions">
                  <button className="icon-btn" onClick={(e) => { e.stopPropagation(); openKpi(row); }}>KPI</button>
                  <button className="icon-btn" onClick={(e) => { e.stopPropagation(); openEditModal(row); }}>Editar</button>
                  <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); void deleteDeliveryById(row.id); }}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </main>
      ) : (
        <main className="main">
          {activeTab === "criativos" ? (
            <CriativosAdsPage onUnauthorized={() => props.onLogout("Sessao expirada. Faça login novamente.")} />
          ) : activeTab === "qualidade" ? (
            <QualidadeLevaPage onUnauthorized={() => props.onLogout("Sessao expirada. Faça login novamente.")} />
          ) : (
            <ConfiguracoesPage onEditorsChanged={() => void loadData()} onUnauthorized={() => props.onLogout("Sessao expirada. Faça login novamente.")} />
          )}
        </main>
      )}

      <div className={`modal-overlay ${isCreateOpen ? "open" : ""}`} onClick={() => setCreateOpen(false)}>
        <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
          <h2 className="modal-title">{editingDeliveryId ? "Editar Entrega" : "Nova Entrega"}</h2>
          <div className="form-grid">
            <div className="form-group full">
              <label>Titulo do material</label>
              <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Ex: VSL - Produto X" />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as NewDeliveryForm["type"] }))}>
                <option value="">Selecione</option>
                {typeOptions.filter((t) => t !== "all").map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Data de Entrega</label>
              <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label>ID da Task</label>
              <input value={form.taskId} onChange={(e) => setForm((p) => ({ ...p, taskId: e.target.value }))} placeholder="#86xyz123" />
            </div>
          </div>

          <div className="editor-checkboxes">
            {activeEditors.map((editor) => {
              const selected = form.editorIds.includes(editor.id);
              return (
                <button
                  type="button"
                  key={editor.id}
                  className={`editor-check-item ${selected ? "selected" : ""}`}
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      editorIds: selected ? p.editorIds.filter((id) => id !== editor.id) : [...p.editorIds, editor.id],
                    }))
                  }
                >
                  <span className="check-box">{selected ? "✓" : ""}</span>
                  <span className={`mini-avatar ${editor.colorClass}`}>{editor.initials}</span>
                  <span>{editor.name}</span>
                </button>
              );
            })}
          </div>

          {form.type !== "Upsell" && (
            <div className="kpi-fields">
              <input placeholder="Retrabalho (0-10)" min={0} max={10} type="number" value={form.retrabalho} onChange={(e) => setForm((p) => ({ ...p, retrabalho: e.target.value }))} />
              <input placeholder="Qualidade (0-10)" min={0} max={10} type="number" value={form.qualidade} onChange={(e) => setForm((p) => ({ ...p, qualidade: e.target.value }))} />
              <input placeholder="Prazo (0-10)" min={0} max={10} type="number" value={form.prazo} onChange={(e) => setForm((p) => ({ ...p, prazo: e.target.value }))} />
            </div>
          )}

          <div className="form-group full">
            <label>Valor da Entrega (R$) - opcional</label>
            <input
              value={form.bonusManual}
              onChange={(e) => setForm((p) => ({ ...p, bonusManual: e.target.value.replace(/[^\d.,]/g, "") }))}
              onBlur={() => {
                const raw = form.bonusManual.trim();
                if (!raw) return;
                const cents = parsePtBRMoneyToCents(raw);
                if (cents == null) return;
                setForm((p) => ({ ...p, bonusManual: formatCentsToPtBR(cents) }));
              }}
              placeholder="Ex: 1.230,90"
            />
          </div>

          <div className="bonus-preview">
            <div>{bonusPreview.note}</div>
            <div className="bp-value">{bonusPreview.text}</div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => { setCreateOpen(false); setEditingDeliveryId(null); }}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editingDeliveryId ? "Salvar Alteracoes" : "Salvar Entrega"}</button>
          </div>
          {formError && <div className="form-error">{formError}</div>}
        </form>
      </div>

      <div
        className="modal-overlay"
        style={{ display: selectedRow ? "flex" : "none" }}
        onClick={() => setSelectedRow(null)}
      >
        <div className="modal kpi-modal" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">Avaliação KPI</h2>
          {selectedRow && (
            <>
              <p className="page-subtitle">{selectedRow.type} - {toPtDate(selectedRow.date)}</p>

              <div className="kpi-criteria">
                <div className="kpi-criterion">
                  <div className="kpi-criterion-top">
                    <span>Retrabalho</span>
                    <span className="kpi-criterion-value">
                      {selectedRow.retrabalho == null ? "-" : `${selectedRow.retrabalho}/10`}
                    </span>
                  </div>
                  <div className="kpi-bar">
                    <div
                      className="kpi-bar-fill"
                      style={{
                        width:
                          selectedRow.retrabalho == null
                            ? "0%"
                            : `${Math.max(0, Math.min(10, selectedRow.retrabalho)) * 10}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="kpi-criterion">
                  <div className="kpi-criterion-top">
                    <span>Qualidade Total</span>
                    <span className="kpi-criterion-value">
                      {selectedRow.qualidade == null ? "-" : `${selectedRow.qualidade}/10`}
                    </span>
                  </div>
                  <div className="kpi-bar">
                    <div
                      className="kpi-bar-fill"
                      style={{
                        width:
                          selectedRow.qualidade == null
                            ? "0%"
                            : `${Math.max(0, Math.min(10, selectedRow.qualidade)) * 10}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="kpi-criterion">
                  <div className="kpi-criterion-top">
                    <span>Prazo</span>
                    <span className="kpi-criterion-value">
                      {selectedRow.prazo == null ? "-" : `${selectedRow.prazo}/10`}
                    </span>
                  </div>
                  <div className="kpi-bar">
                    <div
                      className="kpi-bar-fill"
                      style={{
                        width:
                          selectedRow.prazo == null
                            ? "0%"
                            : `${Math.max(0, Math.min(10, selectedRow.prazo)) * 10}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="bonus-preview">
                <div>Status: {selectedRow.status}</div>
                <div className="bp-value">{formatBRLFromCents(selectedRow.bonus)}</div>
              </div>
              {selectedRow.editorBonuses && selectedRow.editorBonuses.length > 1 ? (
                <div className="bonus-preview" style={{ marginTop: 8 }}>
                  <div>Divisão por editor</div>
                  <div>
                    {selectedRow.editorBonuses.map((item) => {
                      const editor = editors.find((ed) => ed.id === item.editorId);
                      return (
                        <div key={item.editorId}>
                          {(editor?.initials ?? item.editorId)}: {formatBRLFromCents(item.bonusCents)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </>
          )}
          <div className="modal-actions">
            {selectedRow && (
              <>
                <button className="btn btn-ghost" onClick={() => { openEditModal(selectedRow); setSelectedRow(null); }}>Editar</button>
                <button className="btn btn-ghost danger" onClick={() => { void deleteDeliveryById(selectedRow.id); }}>Excluir</button>
              </>
            )}
            <button className="btn btn-ghost" onClick={() => setSelectedRow(null)}>Fechar</button>
          </div>
        </div>
      </div>

      {loading && <div className="loading-overlay">Carregando...</div>}
    </div>
  );
}
