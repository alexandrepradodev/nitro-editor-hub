import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Editor } from "../entregas/mockData";
import "./criativos.css";
import "../entregas/entregas.css";
import { apiRequest as authApiRequest } from "../../lib/api";

type AdCreative = {
  id: string;
  editorId: string;
  projeto: string;
  leva: string;
  plataforma: string;
  mediaType: "Video" | "Image";
  quantidade: number;
  unitValueSnapshot: number;
  lineTotalValue: number;
  isManualValue: boolean;
  taskCode: string | null;
  date: string; // YYYY-MM-DD
  observacoes: string | null;
  editor: { name: string; initials: string; colorClass: string };
};

type AccumulatedByEditor = {
  editorId: string;
  editorName: string;
  editorInitials: string;
  editorColorClass: string;
  totalAdsVideo: number;
  accumulatedValueVideo: number; // cents
  totalAdsImage: number;
  accumulatedValueImage: number; // cents
};

type CreateAdCreativeForm = {
  editorId: string;
  projeto: string;
  leva: string;
  plataforma: string;
  mediaType: "Video" | "Image";
  quantidade: number;
  lineTotalValue: string;
  taskCode: string;
  date: string; // YYYY-MM-DD
  observacoes: string;
};

function formatMonthYearBR(d: Date) {
  const month = d.toLocaleString("pt-BR", { month: "long" });
  // Ex: "Fevereiro/2026"
  return `${month.charAt(0).toUpperCase()}${month.slice(1)}/${d.getFullYear()}`;
}

function todayIso() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

function isoMonth(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}`;
}

function formatBRLFromCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function toPtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
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

function formatCentsToPtBR(cents: number) {
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

function getColorClassFromInitials(initialsRaw: string): string {
  const initials = initialsRaw.trim().toUpperCase();
  const colorClasses = ["c-cyan", "c-violet", "c-yellow", "c-orange", "c-green"] as const;
  let sum = 0;
  for (let i = 0; i < initials.length; i++) sum += initials.charCodeAt(i);
  return colorClasses[sum % colorClasses.length];
}

export default function CriativosAdsPage(props: { onUnauthorized?: () => void }) {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const token = localStorage.getItem("auth_token");

  const periodLabel = useMemo(() => formatMonthYearBR(new Date()), []);
  const currentMonth = useMemo(() => isoMonth(new Date()), []);

  const [editors, setEditors] = useState<Editor[]>([]);
  const [accumulated, setAccumulated] = useState<AccumulatedByEditor[]>([]);
  const [creatives, setCreatives] = useState<AdCreative[]>([]);

  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState("");
  const [editingCreativeId, setEditingCreativeId] = useState<string | null>(null);
  const activeEditors = useMemo(() => editors.filter((editor) => editor.isActive), [editors]);
  const [search, setSearch] = useState("");
  const [selectedEditor, setSelectedEditor] = useState<string>("");
  const [selectedType, setSelectedType] = useState<"all" | "Video" | "Image">("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => currentMonth);

  const resolveColorClass = (initials: string, colorClass?: string) =>
    colorClass && colorClass.trim() ? colorClass : getColorClassFromInitials(initials);

  const [form, setForm] = useState<CreateAdCreativeForm>({
    editorId: "",
    projeto: "",
    leva: "",
    plataforma: "FB",
    mediaType: "Image",
    quantidade: 1,
    lineTotalValue: "",
    taskCode: "",
    date: todayIso(),
    observacoes: "",
  });

  async function loadData() {
    if (!token) return;
    setLoading(true);
    setFormError("");
    try {
      const [editorsData, accumulatedData, creativesData] = await Promise.all([
        authApiRequest<Editor[]>({ apiUrl, path: "/editors", token, onUnauthorized: props.onUnauthorized }),
        authApiRequest<AccumulatedByEditor[]>({
          apiUrl,
          path: `/ad-creatives/accumulated?month=${encodeURIComponent(currentMonth)}`,
          token,
          onUnauthorized: props.onUnauthorized,
        }),
        authApiRequest<AdCreative[]>({
          apiUrl,
          path: `/ad-creatives?month=${encodeURIComponent(currentMonth)}`,
          token,
          onUnauthorized: props.onUnauthorized,
        }),
      ]);

      setEditors(editorsData);
      setAccumulated(accumulatedData);
      setCreatives(creativesData);

      const firstActiveEditorId = editorsData.find((editor) => editor.isActive)?.id ?? "";
      setForm((prev) => ({
        ...prev,
        editorId: prev.editorId || firstActiveEditorId,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar dados de criativos";
      setFormError(message);
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData().catch(() => {
      // erro já foi exibido via setFormError
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of creatives) set.add(item.date.slice(0, 7));
    set.add(currentMonth);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [creatives, currentMonth]);

  const filteredCreatives = useMemo(() => {
    return creatives.filter((row) => {
      const matchMonth = !selectedMonth || row.date.slice(0, 7) === selectedMonth;
      const matchEditor = !selectedEditor || row.editorId === selectedEditor;
      const matchType = selectedType === "all" || row.mediaType === selectedType;
      const searchText = `${row.projeto} ${row.leva} ${row.plataforma} ${row.taskCode ?? ""} ${row.editor.name}`.toLowerCase();
      const matchSearch = !search || searchText.includes(search.toLowerCase());
      return matchMonth && matchEditor && matchType && matchSearch;
    });
  }, [creatives, search, selectedEditor, selectedType, selectedMonth]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!token) {
      setFormError("Sessao expirada. Faça login novamente.");
      return;
    }

    if (!form.editorId) {
      setFormError("Selecione um editor.");
      return;
    }

    if (!form.projeto.trim()) {
      setFormError("Informe o projeto.");
      return;
    }

    if (!form.leva.trim()) {
      setFormError("Informe a leva.");
      return;
    }

    if (!form.quantidade || form.quantidade < 1) {
      setFormError("Quantidade deve ser >= 1.");
      return;
    }

    const lineTotalRaw = form.lineTotalValue.trim();
    const lineTotalParsed = lineTotalRaw ? parsePtBRMoneyToCents(lineTotalRaw) : null;
    if (lineTotalRaw && lineTotalParsed == null) {
      setFormError("Valor do criativo inválido. Ex: 1.230,90");
      return;
    }

    try {
      const method = editingCreativeId ? "PATCH" : "POST";
      const path = editingCreativeId ? `/ad-creatives/${editingCreativeId}` : "/ad-creatives";

      await authApiRequest<AdCreative>({
        apiUrl,
        path,
        token,
        onUnauthorized: props.onUnauthorized,
        init: {
          method,
          body: JSON.stringify({
            editorId: form.editorId,
            projeto: form.projeto,
            leva: form.leva,
            plataforma: form.plataforma || "FB",
            mediaType: form.mediaType,
            quantidade: form.quantidade,
            lineTotalValue: lineTotalParsed ?? undefined,
            taskCode: form.taskCode.trim() ? form.taskCode.trim() : undefined,
            date: form.date,
            observacoes: form.observacoes.trim() ? form.observacoes.trim() : undefined,
          }),
        },
      });

      // Atualiza painel e prepara o formulário para um novo registro.
      await loadData();

      setForm((prev) => ({
        ...prev,
        projeto: "",
        leva: "",
        quantidade: 1,
        lineTotalValue: "",
        taskCode: "",
        observacoes: "",
        plataforma: prev.plataforma || "FB",
        mediaType: prev.mediaType,
        date: todayIso(),
      }));
      setEditingCreativeId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar AD";
      setFormError(message);
    }
  }

  function openEditCreative(item: AdCreative) {
    const isItemEditorActive = editors.some((editor) => editor.id === item.editorId && editor.isActive);
    setEditingCreativeId(item.id);
    setFormError(
      isItemEditorActive
        ? ""
        : "O editor deste criativo está inativo. Selecione um editor ativo para salvar."
    );
    setForm({
      editorId: isItemEditorActive ? item.editorId : "",
      projeto: item.projeto,
      leva: item.leva,
      plataforma: item.plataforma,
      mediaType: item.mediaType,
      quantidade: item.quantidade,
      lineTotalValue: formatCentsToPtBR(item.lineTotalValue),
      taskCode: item.taskCode ?? "",
      date: item.date,
      observacoes: item.observacoes ?? "",
    });
  }

  async function onDeleteCreative(id: string) {
    const ok = window.confirm("Deseja realmente excluir este criativo?");
    if (!ok) return;
    try {
      await authApiRequest<void>({
        apiUrl,
        path: `/ad-creatives/${id}`,
        token,
        onUnauthorized: props.onUnauthorized,
        init: { method: "DELETE" },
      });
      if (editingCreativeId === id) {
        setEditingCreativeId(null);
      }
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao excluir criativo";
      setFormError(message);
    }
  }

  return (
    <div className="criativos-page">
      <div className="criativos-header">
        <div>
          <h1 className="page-title">Criativos ADs</h1>
          <p className="page-subtitle">Periodo: {periodLabel}</p>
        </div>

        <button
          type="button"
          className="btn btn-ghost criativos-import-btn"
          onClick={() => setFormError("Importacao ainda nao implementada.")}
          title="Importar"
        >
          <span className="criativos-import-icon">+</span> Importar
        </button>
      </div>

      <div className="criativos-grid">
        <div className="criativos-left">
          <div className="criativos-card">
            <div className="criativos-card-title">Novo Registro de AD</div>

            <form onSubmit={handleSubmit} className="criativos-form">
              <label className="criativos-field">
                <span className="criativos-label">Editor</span>
                <select
                  className="criativos-input"
                  value={form.editorId}
                  onChange={(e) => setForm((p) => ({ ...p, editorId: e.target.value }))}
                >
                  <option value="">Selecione um editor</option>
                  {activeEditors.map((ed) => (
                    <option key={ed.id} value={ed.id}>
                      {ed.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="criativos-row">
                <label className="criativos-field">
                  <span className="criativos-label">Projeto</span>
                  <input
                    className="criativos-input"
                    value={form.projeto}
                    onChange={(e) => setForm((p) => ({ ...p, projeto: e.target.value }))}
                    placeholder="Nome do projeto"
                  />
                </label>

                <label className="criativos-field">
                  <span className="criativos-label">Leva</span>
                  <input
                    className="criativos-input"
                    value={form.leva}
                    onChange={(e) => setForm((p) => ({ ...p, leva: e.target.value }))}
                    placeholder="Nome da leva"
                  />
                </label>
              </div>

              <div className="criativos-row">
                <label className="criativos-field">
                  <span className="criativos-label">Plataforma</span>
                  <select
                    className="criativos-input"
                    value={form.plataforma}
                    onChange={(e) => setForm((p) => ({ ...p, plataforma: e.target.value }))}
                  >
                    <option value="FB">FB</option>
                    <option value="IG">IG</option>
                  </select>
                </label>

                <label className="criativos-field">
                  <span className="criativos-label">Quantidade</span>
                  <input
                    className="criativos-input"
                    type="number"
                    min={1}
                    value={form.quantidade}
                    onChange={(e) => setForm((p) => ({ ...p, quantidade: Number(e.target.value) }))}
                  />
                </label>
              </div>

              <label className="criativos-field">
                <span className="criativos-label">Valor do criativo (R$) - opcional</span>
                <input
                  className="criativos-input"
                  type="text"
                  inputMode="decimal"
                  value={form.lineTotalValue}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lineTotalValue: e.target.value.replace(/[^\d.,]/g, "") }))
                  }
                  onBlur={() => {
                    const raw = form.lineTotalValue.trim();
                    if (!raw) return;
                    const cents = parsePtBRMoneyToCents(raw);
                    if (cents == null) return;
                    setForm((p) => ({ ...p, lineTotalValue: formatCentsToPtBR(cents) }));
                  }}
                  placeholder="Ex: 1.230,90"
                />
              </label>

              <label className="criativos-field">
                <span className="criativos-label">Tipo do criativo</span>
                <select
                  className="criativos-input"
                  value={form.mediaType}
                  onChange={(e) => setForm((p) => ({ ...p, mediaType: e.target.value as "Video" | "Image" }))}
                >
                  <option value="Video">Vídeo</option>
                  <option value="Image">Imagem</option>
                </select>
              </label>

              <label className="criativos-field">
                <span className="criativos-label">Task Code</span>
                <input
                  className="criativos-input"
                  value={form.taskCode}
                  onChange={(e) => setForm((p) => ({ ...p, taskCode: e.target.value }))}
                  placeholder="ex: TSK-123"
                />
              </label>

              <label className="criativos-field">
                <span className="criativos-label">Data de producao pelo setor de edicao</span>
                <input
                  className="criativos-input"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </label>

              <label className="criativos-field">
                <span className="criativos-label">Observacoes</span>
                <textarea
                  className="criativos-textarea"
                  value={form.observacoes}
                  onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
                  placeholder="Opcional..."
                />
              </label>

              <div className="criativos-actions">
                <button type="submit" className="btn btn-primary criativos-register-btn">
                  {editingCreativeId ? "Salvar alterações" : "+ Registrar AD"}
                </button>
                {editingCreativeId && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setEditingCreativeId(null);
                      setFormError("");
                      setForm({
                        editorId: activeEditors[0]?.id ?? "",
                        projeto: "",
                        leva: "",
                        plataforma: "FB",
                        mediaType: "Image",
                        quantidade: 1,
                        lineTotalValue: "",
                        taskCode: "",
                        date: todayIso(),
                        observacoes: "",
                      });
                    }}
                  >
                    Cancelar edição
                  </button>
                )}
              </div>

              {formError && <div className="form-error">{formError}</div>}
            </form>
          </div>
        </div>

        <div className="criativos-right">
          <div className="criativos-accumulated">
            <div className="criativos-accumulated-title">ACUMULADO POR EDITOR</div>

            {loading ? (
              <div className="criativos-empty">Carregando...</div>
            ) : accumulated.length === 0 ? (
              <div className="criativos-empty">Nenhum AD registrado para este periodo.</div>
            ) : (
              <div className="criativos-accumulated-list">
                {accumulated.map((item) => (
                  <div className="criativos-accumulated-item" key={item.editorId}>
                    <div className="criativos-accumulated-row">
                      <div className="criativos-acc-name">
                        {item.editorName}
                        <span className={`criativos-acc-initials mini-avatar ${resolveColorClass(item.editorInitials, item.editorColorClass)}`}>
                          {item.editorInitials}
                        </span>
                      </div>
                      <div className="criativos-acc-qty">
                        <div>{item.totalAdsVideo} Vídeo(s)</div>
                        <div>{item.totalAdsImage} Imagem(ns)</div>
                      </div>
                    </div>
                    <div className="criativos-acc-value">
                      <div>{formatBRLFromCents(item.accumulatedValueVideo)}</div>
                      <div>{formatBRLFromCents(item.accumulatedValueImage)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="criativos-deliveries-section">
        <div className="criativos-card">
          <div className="criativos-card-title">REGISTRO DE CRIATIVOS</div>

          <div className="filters-row criativos-filters-row">
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
              {editors.map((ed) => (
                <option key={ed.id} value={ed.id}>
                  {ed.name}
                </option>
              ))}
            </select>
            <input
              className="search-input"
              placeholder="Buscar por projeto, leva, task, plataforma ou editor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="records-count">{filteredCreatives.length} registros</div>
          </div>

          <div className="type-filters">
            {(["all", "Video", "Image"] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={`type-filter-pill ${selectedType === type ? "on" : ""}`}
                onClick={() => setSelectedType(type)}
              >
                {type === "all" ? "Todos" : type === "Video" ? "Vídeo" : "Imagem"}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="criativos-empty">Carregando...</div>
          ) : filteredCreatives.length === 0 ? (
            <div className="criativos-empty">Nenhum criativo encontrado para os filtros aplicados.</div>
          ) : (
            <div className="criativos-table-wrap">
              <div className="criativos-table-header-row">
                <div>#</div>
                <div>Tipo</div>
                <div>Editor</div>
                <div>Projeto</div>
                <div>Leva</div>
                <div>Plataforma</div>
                <div>Quantidade</div>
                <div>Valor</div>
                <div>Data</div>
                <div>Task</div>
                <div>Ações</div>
              </div>
              {filteredCreatives.map((row, idx) => (
                <div key={row.id} className="criativos-table-row">
                  <div className="criativos-row-num">{String(idx + 1).padStart(2, "0")}</div>
                  <div>
                    <span className={`criativos-media-pill ${row.mediaType === "Video" ? "is-video" : "is-image"}`}>
                      {row.mediaType === "Video" ? "Vídeo" : "Imagem"}
                    </span>
                  </div>
                  <div className="criativos-editor-cell">
                    <span className={`criativos-acc-initials mini-avatar ${resolveColorClass(row.editor.initials, row.editor.colorClass)}`}>
                      {row.editor.initials}
                    </span>{" "}
                    {row.editor.name}
                  </div>
                  <div className="criativos-cell-truncate">{row.projeto}</div>
                  <div className="criativos-cell-truncate">{row.leva}</div>
                  <div>{row.plataforma}</div>
                  <div>{row.quantidade}</div>
                  <div>{formatBRLFromCents(row.lineTotalValue)}</div>
                  <div>{toPtDate(row.date)}</div>
                  <div>{row.taskCode ?? "-"}</div>
                  <div className="row-actions">
                    <button type="button" className="icon-btn" onClick={() => openEditCreative(row)}>
                      Editar
                    </button>
                    <button type="button" className="icon-btn danger" onClick={() => void onDeleteCreative(row.id)}>
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {loading && <div className="loading-overlay">Carregando...</div>}
    </div>
  );
}

