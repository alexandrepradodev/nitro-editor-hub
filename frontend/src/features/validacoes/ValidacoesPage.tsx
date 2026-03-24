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
import "./validacoes.css";

type ValidationType = "ad" | "vsl" | "troca" | "leadml";

type Editor = {
  id: string;
  name: string;
  initials: string;
  colorClass: string;
  isActive: boolean;
};

type DeliveryRecord = {
  id: string;
  title: string;
  taskId?: string | null;
  type: "VSL" | "Lead" | "ML" | "Troca" | "Upsell";
  editorIds: string[];
  date: string;
  bonus: number;
  investmentUsd?: number | null;
  roas?: number | null;
};

type AdCreativeRecord = {
  id: string;
  editorId: string;
  projeto: string;
  leva: string;
  date: string;
  lineTotalValue: number;
  investmentUsd?: number | null;
  roas?: number | null;
};

type UnifiedValidation = {
  id: string;
  source: "delivery" | "ad";
  type: ValidationType;
  date: string;
  title: string;
  editorIds: string[];
  bonusCents: number;
  investmentUsd: number;
  roas: number;
};

type ValidationForm = {
  type: ValidationType;
  date: string;
  title: string;
  editorIds: string[];
  bonusBrl: string;
  investmentUsd: string;
  roas: string;
};

function getTodayIsoDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(ym: string) {
  const [yStr, mStr] = ym.split("-");
  const date = new Date(Number(yStr), Number(mStr) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date).toUpperCase();
}

function formatBRLFromCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatUSDMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
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

function formatCentsToPtBR(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function splitBonusCents(totalCents: number, count: number) {
  if (count <= 0) return [];
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, idx) => (idx === count - 1 ? base + remainder : base));
}

function toPtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function normalizeValidationName(value: string) {
  return value.trim().toLowerCase();
}

const emptyForm = (editorId: string | null): ValidationForm => ({
  type: "ad",
  date: getTodayIsoDate(),
  title: "",
  editorIds: editorId ? [editorId] : [],
  bonusBrl: "",
  investmentUsd: "",
  roas: "",
});

export default function ValidacoesPage(props: { onLogout: (reason?: string) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  function goToEntregasTab(tab: "entregas" | "criativos" | "configuracoes" | "qualidade") {
    const params = new URLSearchParams();
    if (tab !== "entregas") params.set("tab", tab);
    const query = params.toString();
    navigate(`/${query ? `?${query}` : ""}`);
  }

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const token = localStorage.getItem("auth_token");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editors, setEditors] = useState<Editor[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [adCreatives, setAdCreatives] = useState<AdCreativeRecord[]>([]);
  const [allDeliveries, setAllDeliveries] = useState<DeliveryRecord[]>([]);
  const [allAdCreatives, setAllAdCreatives] = useState<AdCreativeRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey);
  const [selectedEditorId, setSelectedEditorId] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | ValidationType>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UnifiedValidation | null>(null);
  const [form, setForm] = useState<ValidationForm>(() => emptyForm(null));

  const activeEditors = useMemo(() => editors.filter((editor) => editor.isActive), [editors]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    set.add(selectedMonth);
    for (const d of deliveries) set.add(d.date.slice(0, 7));
    for (const c of adCreatives) set.add(c.date.slice(0, 7));
    set.add(getCurrentMonthKey());
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [selectedMonth, deliveries, adCreatives]);

  async function loadData(month: string) {
    if (!token) return;
    const unauthorized = () => props.onLogout("Sessao expirada. Faça login novamente.");
    const [editorsData, deliveriesData, adCreativesData, allDeliveriesData, allAdCreativesData] = await Promise.all([
      apiRequest<Editor[]>({ apiUrl, path: "/editors", token, onUnauthorized: unauthorized }),
      apiRequest<DeliveryRecord[]>({
        apiUrl,
        path: `/deliveries?month=${encodeURIComponent(month)}`,
        token,
        onUnauthorized: unauthorized,
      }),
      apiRequest<AdCreativeRecord[]>({
        apiUrl,
        path: `/ad-creatives?month=${encodeURIComponent(month)}`,
        token,
        onUnauthorized: unauthorized,
      }),
      apiRequest<DeliveryRecord[]>({
        apiUrl,
        path: "/deliveries",
        token,
        onUnauthorized: unauthorized,
      }),
      apiRequest<AdCreativeRecord[]>({
        apiUrl,
        path: "/ad-creatives",
        token,
        onUnauthorized: unauthorized,
      }),
    ]);
    setEditors(editorsData);
    setDeliveries(deliveriesData);
    setAdCreatives(adCreativesData);
    setAllDeliveries(allDeliveriesData);
    setAllAdCreatives(allAdCreativesData);
    const firstEditor = editorsData.find((editor) => editor.isActive)?.id ?? null;
    setForm((prev) => (prev.editorIds.length ? prev : emptyForm(firstEditor)));
  }

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    void loadData(selectedMonth)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar validações"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, token]);

  const unifiedData = useMemo<UnifiedValidation[]>(() => {
    const fromDeliveries = deliveries
      .filter((item) => item.type === "VSL" || item.type === "Troca" || item.type === "Lead")
      .map((item) => ({
        id: item.id,
        source: "delivery" as const,
        type: item.type === "VSL" ? ("vsl" as const) : item.type === "Troca" ? ("troca" as const) : ("leadml" as const),
        date: item.date,
        title: item.title,
        editorIds: item.editorIds,
        bonusCents: item.bonus ?? 0,
        investmentUsd: item.investmentUsd ?? 0,
        roas: item.roas ?? 0,
      }));

    const fromAds = adCreatives.map((item) => ({
      id: item.id,
      source: "ad" as const,
      type: "ad" as const,
      date: item.date,
      title: item.projeto || item.leva,
      editorIds: [item.editorId],
      bonusCents: item.lineTotalValue ?? 0,
      investmentUsd: item.investmentUsd ?? 0,
      roas: item.roas ?? 0,
    }));

    return [...fromDeliveries, ...fromAds].sort((a, b) => b.date.localeCompare(a.date));
  }, [deliveries, adCreatives]);

  const filtered = useMemo(
    () =>
      unifiedData.filter((row) => {
        const monthOk = row.date.slice(0, 7) === selectedMonth;
        const typeOk = selectedType === "all" || row.type === selectedType;
        const editorOk = !selectedEditorId || row.editorIds.includes(selectedEditorId);
        return monthOk && typeOk && editorOk;
      }),
    [unifiedData, selectedMonth, selectedType, selectedEditorId],
  );

  const summary = useMemo(() => {
    const totalBonus = filtered.reduce((acc, row) => acc + row.bonusCents, 0);
    const totalInvest = filtered.reduce((acc, row) => acc + row.investmentUsd, 0);
    return {
      totalValidacoes: filtered.length,
      totalBonus,
      ads: filtered.filter((row) => row.type === "ad").length,
      vsl: filtered.filter((row) => row.type === "vsl").length,
      troca: filtered.filter((row) => row.type === "troca").length,
      leadml: filtered.filter((row) => row.type === "leadml").length,
      totalInvest,
    };
  }, [filtered]);

  const validationNameIndex = useMemo(() => {
    const index = new Map<string, { source: "delivery" | "ad"; id: string }[]>();
    const deliveryRows = allDeliveries
      .filter((item) => item.type === "VSL" || item.type === "Troca" || item.type === "Lead")
      .map((item) => ({ source: "delivery" as const, id: item.id, name: item.title }));
    const adRows = allAdCreatives.map((item) => ({ source: "ad" as const, id: item.id, name: item.projeto }));

    for (const row of [...deliveryRows, ...adRows]) {
      const normalized = normalizeValidationName(row.name);
      if (!normalized) continue;
      const existing = index.get(normalized) ?? [];
      existing.push({ source: row.source, id: row.id });
      index.set(normalized, existing);
    }
    return index;
  }, [allDeliveries, allAdCreatives]);

  function openCreateModal() {
    setEditing(null);
    setError("");
    setSuccess("");
    setForm(emptyForm(activeEditors[0]?.id ?? null));
    setModalOpen(true);
  }

  function openEditModal(item: UnifiedValidation) {
    setEditing(item);
    setError("");
    setSuccess("");
    setForm({
      type: item.type,
      date: item.date,
      title: item.title,
      editorIds: item.editorIds,
      bonusBrl: formatCentsToPtBR(item.bonusCents),
      investmentUsd: item.investmentUsd ? String(item.investmentUsd) : "",
      roas: item.roas ? String(item.roas) : "",
    });
    setModalOpen(true);
  }

  function toggleEditor(id: string) {
    setForm((prev) => {
      const selected = prev.editorIds.includes(id);
      if (prev.type === "ad") return { ...prev, editorIds: selected ? [] : [id] };
      return {
        ...prev,
        editorIds: selected ? prev.editorIds.filter((eid) => eid !== id) : [...prev.editorIds, id],
      };
    });
  }

  async function onSubmit() {
    if (!token) return;
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Informe a nomenclatura.");
      return;
    }
    const normalizedTitle = normalizeValidationName(form.title);
    const conflicts = validationNameIndex.get(normalizedTitle) ?? [];
    const hasConflict = conflicts.some((conflict) => {
      if (!editing) return true;
      return !(conflict.source === editing.source && conflict.id === editing.id);
    });
    if (hasConflict) {
      setError("Ja existe validacao com esta nomenclatura.");
      return;
    }
    if (form.editorIds.length === 0) {
      setError("Selecione ao menos um editor.");
      return;
    }

    const bonusCents = parsePtBRMoneyToCents(form.bonusBrl);
    if (bonusCents == null) {
      setError("Informe um bônus válido em reais.");
      return;
    }

    const investment = form.investmentUsd.trim() ? Number(form.investmentUsd) : 0;
    const roas = form.roas.trim() ? Number(form.roas) : 0;
    if (!Number.isFinite(investment) || investment < 0 || !Number.isFinite(roas) || roas < 0) {
      setError("Investimento e ROAS devem ser números válidos.");
      return;
    }

    const unauthorized = () => props.onLogout("Sessao expirada. Faça login novamente.");
    setSaving(true);
    try {
      if (form.type === "ad") {
        const payload = {
          editorId: form.editorIds[0],
          projeto: form.title.trim(),
          leva: form.title.trim(),
          plataforma: "FB",
          mediaType: "Video",
          quantidade: 1,
          lineTotalValue: bonusCents,
          date: form.date,
          investmentUsd: investment,
          roas,
        };
        await apiRequest({
          apiUrl,
          path: editing?.source === "ad" ? `/ad-creatives/${editing.id}` : "/ad-creatives",
          token,
          onUnauthorized: unauthorized,
          init: {
            method: editing?.source === "ad" ? "PATCH" : "POST",
            body: JSON.stringify(payload),
          },
        });
      } else {
        const payload = {
          title: form.title.trim(),
          type: form.type === "vsl" ? "VSL" : form.type === "troca" ? "Troca" : "Lead",
          date: form.date,
          editorIds: form.editorIds,
          bonusManual: bonusCents,
          investmentUsd: investment,
          roas,
        };
        await apiRequest({
          apiUrl,
          path: editing?.source === "delivery" ? `/deliveries/${editing.id}` : "/deliveries",
          token,
          onUnauthorized: unauthorized,
          init: {
            method: editing?.source === "delivery" ? "PATCH" : "POST",
            body: JSON.stringify(payload),
          },
        });
      }

      setSuccess(editing ? "Validação atualizada com sucesso." : "Validação criada com sucesso.");
      setModalOpen(false);
      setEditing(null);
      await loadData(selectedMonth);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar validação");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(item: UnifiedValidation) {
    if (!token) return;
    const confirmed = window.confirm("Deseja excluir esta validação?");
    if (!confirmed) return;

    const unauthorized = () => props.onLogout("Sessao expirada. Faça login novamente.");
    setDeletingId(item.id);
    setError("");
    setSuccess("");
    try {
      await apiRequest({
        apiUrl,
        path: item.source === "ad" ? `/ad-creatives/${item.id}` : `/deliveries/${item.id}`,
        token,
        onUnauthorized: unauthorized,
        init: { method: "DELETE" },
      });
      setSuccess("Validação excluída com sucesso.");
      await loadData(selectedMonth);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir validação");
    } finally {
      setDeletingId(null);
    }
  }

  const isSquad = form.type === "vsl" || form.type === "troca";
  const division = splitBonusCents(parsePtBRMoneyToCents(form.bonusBrl) ?? 0, form.editorIds.length || 1);

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
          <div className="nav-item" onClick={() => goToEntregasTab("entregas")}>
            <span className="nav-item-icon" aria-hidden="true">
              <IconEntregasVsl />
            </span>
            <span className="nav-item-label">Entregas VSL</span>
          </div>
          <div className="nav-item" onClick={() => goToEntregasTab("criativos")}>
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
          <div className="nav-item" onClick={() => goToEntregasTab("qualidade")}>
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
          <div className="nav-item" onClick={() => goToEntregasTab("configuracoes")}>
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

      <main className="main">
        <div className="page-header">
          <div>
            <h1 className="page-title">Validações</h1>
            <p className="page-subtitle">Bônus manuais por AD Criativo, VSL Squad e Troca Squad</p>
          </div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Nova Validação
          </button>
        </div>

        <div className="summary-strip">
          <div className="sum-card">
            <div className="sum-label">Total Validações</div>
            <div className="sum-value cyan">{summary.totalValidacoes}</div>
          </div>
          <div className="sum-card">
            <div className="sum-label">AD Criativo</div>
            <div className="sum-value yellow">{summary.ads}</div>
          </div>
          <div className="sum-card">
            <div className="sum-label">VSL Squad</div>
            <div className="sum-value">{summary.vsl}</div>
          </div>
          <div className="sum-card">
            <div className="sum-label">Troca Squad</div>
            <div className="sum-value">{summary.troca}</div>
          </div>
          <div className="sum-card">
            <div className="sum-label">LEAD / ML</div>
            <div className="sum-value">{summary.leadml}</div>
          </div>
          <div className="sum-card">
            <div className="sum-label">Investimento</div>
            <div className="sum-value">{formatUSDMoney(summary.totalInvest)}</div>
          </div>
          <div className="sum-card">
            <div className="sum-label">Total Bônus</div>
            <div className="sum-value green">{formatBRLFromCents(summary.totalBonus)}</div>
          </div>
        </div>

        <div className="filters-row">
          <select className="filter-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {formatMonthLabel(month)}
              </option>
            ))}
          </select>
          <select className="filter-select" value={selectedEditorId} onChange={(e) => setSelectedEditorId(e.target.value)}>
            <option value="">Todos os Editores</option>
            {editors.map((editor) => (
              <option key={editor.id} value={editor.id}>
                {editor.name}
              </option>
            ))}
          </select>
          <div className="type-filters">
            {(["all", "ad", "vsl", "troca", "leadml"] as const).map((type) => (
              <button
                key={type}
                className={`type-filter-pill ${selectedType === type ? "on" : ""}`}
                onClick={() => setSelectedType(type)}
              >
                {type === "all"
                  ? "Todos"
                  : type === "ad"
                    ? "AD Criativo"
                    : type === "vsl"
                      ? "VSL Squad"
                      : type === "troca"
                        ? "Troca Squad"
                        : "LEAD / ML"}
              </button>
            ))}
          </div>
          <div className="records-count">{filtered.length} validações</div>
        </div>

        {error ? <div className="form-error">{error}</div> : null}
        {success ? <div className="form-success">{success}</div> : null}

        <div className="val-grid">
          {filtered.map((item) => (
            <div key={`${item.source}-${item.id}`} className={`val-card c-${item.type}`}>
              <div className="vc-head">
                <div>
                  <span className={`tipo-pill tp-${item.type}`}>
                    {item.type === "ad"
                      ? "AD Criativo"
                      : item.type === "vsl"
                        ? "VSL Squad"
                        : item.type === "troca"
                          ? "Troca Squad"
                          : "LEAD / ML"}
                  </span>
                  <div className="vc-date">{toPtDate(item.date)}</div>
                </div>
                <div className="row-actions">
                  <button className="icon-btn" onClick={() => openEditModal(item)}>
                    Editar
                  </button>
                  <button className="icon-btn danger" onClick={() => void onDelete(item)} disabled={deletingId === item.id}>
                    {deletingId === item.id ? "..." : "Excluir"}
                  </button>
                </div>
              </div>
              <div className="vc-nomen">{item.title}</div>
              <div className="vc-stats">
                <div className="vc-stat">
                  <div className="vc-stat-lbl">Investimento</div>
                  <div className="vc-stat-val">{formatUSDMoney(item.investmentUsd)}</div>
                </div>
                <div className="vc-stat">
                  <div className="vc-stat-lbl">ROAS</div>
                  <div className={`vc-stat-val ${item.roas >= 3 ? "roas-high" : item.roas >= 1.5 ? "roas-mid" : "roas-low"}`}>
                    {item.roas.toFixed(1)}x
                  </div>
                </div>
              </div>
              <div className={`vc-bonus b-${item.type}`}>
                <span className="vc-bonus-lbl">{item.type === "ad" ? "Bônus" : "Total Squad"}</span>
                <span className={`vc-bonus-val bv-${item.type}`}>{formatBRLFromCents(item.bonusCents)}</span>
              </div>
              <div className="vc-divider" />
              <div className="vc-editors">
                <div className="vc-eds-lbl">{item.editorIds.length > 1 ? "Divisão por Editor" : "Editor"}</div>
                {item.editorIds.map((editorId, idx) => {
                  const editor = editors.find((e) => e.id === editorId);
                  if (!editor) return null;
                  const split = splitBonusCents(item.bonusCents, item.editorIds.length)[idx] ?? item.bonusCents;
                  return (
                    <div key={editorId} className="vc-ed-row">
                      <div className={`mini-avatar ${editor.colorClass}`}>{editor.initials}</div>
                      <span className="vc-ed-name">{editor.name}</span>
                      <span className={`vc-ed-val ${item.editorIds.length > 1 ? "split" : "full"}`}>{formatBRLFromCents(split)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {!loading && filtered.length === 0 ? <div className="qualidade-empty">Nenhuma validação encontrada para os filtros.</div> : null}
      </main>

      <div className={`modal-overlay ${modalOpen ? "open" : ""}`} onClick={() => setModalOpen(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">{editing ? "Editar Validação" : "Nova Validação"}</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Tipo</label>
              <select
                value={form.type}
                onChange={(e) => {
                  const nextType = e.target.value as ValidationType;
                  setForm((prev) => ({
                    ...prev,
                    type: nextType,
                    editorIds: nextType === "ad" ? (prev.editorIds[0] ? [prev.editorIds[0]] : []) : prev.editorIds,
                  }));
                }}
              >
                <option value="ad">AD Criativo</option>
                <option value="vsl">VSL Squad</option>
                <option value="troca">Troca Squad</option>
                <option value="leadml">LEAD / ML</option>
              </select>
            </div>
            <div className="form-group">
              <label>Data</label>
              <input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label>Nomenclatura</label>
              <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Investimento (US$)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.investmentUsd}
                onChange={(e) => setForm((prev) => ({ ...prev, investmentUsd: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>ROAS</label>
              <input
                type="number"
                min={0}
                step="0.1"
                value={form.roas}
                onChange={(e) => setForm((prev) => ({ ...prev, roas: e.target.value }))}
              />
            </div>
            <div className="form-group full">
              <label>{isSquad ? "Valor Total do Squad (R$)" : "Valor do Bônus (R$)"}</label>
              <input
                value={form.bonusBrl}
                placeholder="Ex: 1.250,00"
                onChange={(e) => setForm((prev) => ({ ...prev, bonusBrl: e.target.value.replace(/[^\d.,]/g, "") }))}
                onBlur={() => {
                  const cents = parsePtBRMoneyToCents(form.bonusBrl);
                  if (cents != null) setForm((prev) => ({ ...prev, bonusBrl: formatCentsToPtBR(cents) }));
                }}
              />
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
                  onClick={() => toggleEditor(editor.id)}
                >
                  <span className="check-box">{selected ? "✓" : ""}</span>
                  <span className={`mini-avatar ${editor.colorClass}`}>{editor.initials}</span>
                  <span>{editor.name}</span>
                </button>
              );
            })}
          </div>

          {isSquad ? (
            <div className="bonus-preview">
              <div>Divisão por editor</div>
              <div className="squad-split-preview">
                {form.editorIds.map((editorId, idx) => {
                  const editor = editors.find((item) => item.id === editorId);
                  if (!editor) return null;
                  return (
                    <span key={editorId}>
                      {editor.initials}: {formatBRLFromCents(division[idx] ?? 0)}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void onSubmit()} disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Salvar validação"}
            </button>
          </div>
        </div>
      </div>

      {loading ? <div className="loading-overlay">Carregando...</div> : null}
    </div>
  );
}
