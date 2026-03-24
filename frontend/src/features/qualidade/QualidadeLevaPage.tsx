import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../lib/api";
import "../entregas/entregas.css";
import "./qualidade.css";

type Editor = {
  id: string;
  name: string;
  initials: string;
  colorClass: string;
  isActive: boolean;
};

type QualityFormat = "IG" | "GO" | "YT" | "FB";

type QualityLevaInput = {
  id: string;
  project: string;
  levaNumber: string;
  format: QualityFormat;
  note: 1 | 2 | 3 | 4 | 5;
};

type QualityLevaPayload = Omit<QualityLevaInput, "id">;

type QualitySummaryResponse = {
  month: string;
  points: number;
  maxPoints: number;
  accuracyPercent: number;
  totalLevas: number;
  bonusCents: number;
  totalBatches: number;
  totalEditors: number;
};

type QualityRecordsResponse = {
  month: string;
  rows: Array<{
    editorId: string;
    editorName: string;
    editorInitials: string;
    editorColorClass: string;
    totalLevas: number;
    totalPoints: number;
    maxPoints: number;
    accuracyPercent: number;
    bonusCents: number;
  }>;
  batches: Array<{
    id: string;
    editorId: string;
    date: string;
    totalLevas: number;
    totalPoints: number;
    maxPoints: number;
    accuracyPercent: number;
    bonusCents: number;
    items: Array<{
      id: string;
      project: string;
      levaNumber: string;
      format: QualityFormat;
      note: number;
    }>;
  }>;
};

type RealtimeSummary = {
  points: number;
  maxPoints: number;
  accuracyPercent: number;
  totalLevas: number;
  bonusCents: number;
};

function getTodayIsoDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatBRLFromCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(ym: string) {
  const [yStr, mStr] = ym.split("-");
  const date = new Date(Number(yStr), Number(mStr) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date).toUpperCase();
}

function bonusFromAccuracy(accuracyPercent: number) {
  if (accuracyPercent >= 80) return 60000;
  if (accuracyPercent >= 70) return 50000;
  if (accuracyPercent >= 60) return 40000;
  if (accuracyPercent >= 50) return 25000;
  if (accuracyPercent >= 40) return 10000;
  if (accuracyPercent >= 30) return 5000;
  return 0;
}

function buildRealtime(levaItems: QualityLevaInput[]): RealtimeSummary {
  const totalLevas = levaItems.length;
  const points = levaItems.reduce((acc, item) => acc + item.note, 0);
  const maxPoints = totalLevas * 5;
  const accuracyPercent = maxPoints > 0 ? Number(((points / maxPoints) * 100).toFixed(1)) : 0;
  const bonusCents = bonusFromAccuracy(accuracyPercent);
  return { points, maxPoints, accuracyPercent, totalLevas, bonusCents };
}

function emptyLeva(index: number): QualityLevaInput {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    project: "",
    levaNumber: String(index + 1),
    format: "FB",
    note: 1,
  };
}

export default function QualidadeLevaPage(props: { onUnauthorized?: () => void }) {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const token = localStorage.getItem("auth_token");

  const [editors, setEditors] = useState<Editor[]>([]);
  const [selectedEditorId, setSelectedEditorId] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayIsoDate);
  const [levaItems, setLevaItems] = useState<QualityLevaInput[]>([emptyLeva(0)]);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [summary, setSummary] = useState<QualitySummaryResponse | null>(null);
  const [records, setRecords] = useState<QualityRecordsResponse["rows"]>([]);
  const [batches, setBatches] = useState<QualityRecordsResponse["batches"]>([]);
  const [openByEditorId, setOpenByEditorId] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemBatchId, setEditingItemBatchId] = useState<string | null>(null);
  const [editingItemDraft, setEditingItemDraft] = useState<QualityLevaPayload | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const realtime = useMemo(() => buildRealtime(levaItems), [levaItems]);

  const monthOptions = useMemo(() => {
    const options = new Set<string>();
    options.add(selectedMonth);
    options.add(currentMonthKey());
    return Array.from(options).sort((a, b) => b.localeCompare(a));
  }, [selectedMonth]);

  const activeEditors = useMemo(() => editors.filter((editor) => editor.isActive), [editors]);

  async function loadEditors() {
    if (!token) return;
    const response = await apiRequest<Editor[]>({
      apiUrl,
      path: "/editors",
      token,
      onUnauthorized: props.onUnauthorized,
    });
    setEditors(response);
  }

  async function loadPeriodData(month: string) {
    if (!token) return;
    const [summaryResponse, recordsResponse] = await Promise.all([
      apiRequest<QualitySummaryResponse>({
        apiUrl,
        path: `/quality/summary?month=${encodeURIComponent(month)}`,
        token,
        onUnauthorized: props.onUnauthorized,
      }),
      apiRequest<QualityRecordsResponse>({
        apiUrl,
        path: `/quality/batches?month=${encodeURIComponent(month)}`,
        token,
        onUnauthorized: props.onUnauthorized,
      }),
    ]);
    setSummary(summaryResponse);
    setRecords(recordsResponse.rows);
    setBatches(recordsResponse.batches);
    setOpenByEditorId({});
  }

  async function loadData() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadEditors(), loadPeriodData(selectedMonth)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar qualidade da leva");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, token]);

  function addLeva() {
    setLevaItems((prev) => {
      if (prev.length >= 30) return prev;
      return [...prev, emptyLeva(prev.length)];
    });
  }

  function removeLeva(id: string) {
    setLevaItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }

  function updateLeva(
    id: string,
    patch: Partial<Pick<QualityLevaInput, "project" | "levaNumber" | "format" | "note">>,
  ) {
    setLevaItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function resetBatchForm() {
    setEditingBatchId(null);
    setSelectedEditorId("");
    setSelectedDate(getTodayIsoDate());
    setLevaItems([emptyLeva(0)]);
  }

  function startEditBatch(batch: QualityRecordsResponse["batches"][number]) {
    setEditingBatchId(batch.id);
    setSelectedEditorId(batch.editorId);
    setSelectedDate(batch.date);
    setLevaItems(
      batch.items.map((item, index) => ({
        id: `${item.id}-${index}`,
        project: item.project,
        levaNumber: item.levaNumber,
        format: item.format,
        note: item.note as 1 | 2 | 3 | 4 | 5,
      })),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEditItem(batchId: string, item: QualityRecordsResponse["batches"][number]["items"][number]) {
    setEditingItemBatchId(batchId);
    setEditingItemId(item.id);
    setEditingItemDraft({
      project: item.project,
      levaNumber: item.levaNumber,
      format: item.format,
      note: item.note as 1 | 2 | 3 | 4 | 5,
    });
  }

  function cancelEditItem() {
    setEditingItemBatchId(null);
    setEditingItemId(null);
    setEditingItemDraft(null);
  }

  async function onSaveBatch() {
    if (!token) return;
    setError("");
    setSuccess("");

    if (!selectedEditorId) {
      setError("Selecione o editor para salvar.");
      return;
    }

    if (levaItems.some((item) => !item.project.trim() || !item.levaNumber.trim())) {
      setError("Preencha projeto e numero da leva em todas as linhas.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest({
        apiUrl,
        path: editingBatchId ? `/quality/batches/${encodeURIComponent(editingBatchId)}` : "/quality/batches",
        token,
        onUnauthorized: props.onUnauthorized,
        init: {
          method: editingBatchId ? "PATCH" : "POST",
          body: JSON.stringify({
            editorId: selectedEditorId,
            date: selectedDate,
            items: levaItems.map((item) => ({
              project: item.project.trim(),
              levaNumber: item.levaNumber.trim(),
              format: item.format,
              note: item.note,
            })),
          }),
        },
      });
      setSuccess(editingBatchId ? "Lote atualizado com sucesso." : "Levas salvas com sucesso.");
      resetBatchForm();
      await loadPeriodData(selectedMonth);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar qualidade da leva");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteBatch(batchId: string) {
    if (!token) return;
    const confirmed = window.confirm("Deseja excluir este lote?");
    if (!confirmed) return;
    setError("");
    setSuccess("");
    setDeletingBatchId(batchId);
    try {
      await apiRequest({
        apiUrl,
        path: `/quality/batches/${encodeURIComponent(batchId)}`,
        token,
        onUnauthorized: props.onUnauthorized,
        init: { method: "DELETE" },
      });
      if (editingBatchId === batchId) resetBatchForm();
      setSuccess("Lote excluido com sucesso.");
      await loadPeriodData(selectedMonth);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir lote");
    } finally {
      setDeletingBatchId(null);
    }
  }

  async function onSaveItem(batchId: string, itemId: string) {
    if (!token || !editingItemDraft) return;
    if (!editingItemDraft.project.trim() || !editingItemDraft.levaNumber.trim()) {
      setError("Preencha projeto e numero da leva para salvar o item.");
      return;
    }
    setError("");
    setSuccess("");
    setSavingItemId(itemId);
    try {
      await apiRequest({
        apiUrl,
        path: `/quality/batches/${encodeURIComponent(batchId)}/items/${encodeURIComponent(itemId)}`,
        token,
        onUnauthorized: props.onUnauthorized,
        init: {
          method: "PATCH",
          body: JSON.stringify({
            project: editingItemDraft.project.trim(),
            levaNumber: editingItemDraft.levaNumber.trim(),
            format: editingItemDraft.format,
            note: editingItemDraft.note,
          }),
        },
      });
      setSuccess("Item atualizado com sucesso.");
      cancelEditItem();
      await loadPeriodData(selectedMonth);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar item");
    } finally {
      setSavingItemId(null);
    }
  }

  async function onDeleteItem(batchId: string, itemId: string) {
    if (!token) return;
    const confirmed = window.confirm("Deseja excluir esta leva?");
    if (!confirmed) return;
    setError("");
    setSuccess("");
    setDeletingItemId(itemId);
    try {
      await apiRequest({
        apiUrl,
        path: `/quality/batches/${encodeURIComponent(batchId)}/items/${encodeURIComponent(itemId)}`,
        token,
        onUnauthorized: props.onUnauthorized,
        init: { method: "DELETE" },
      });
      if (editingItemId === itemId) cancelEditItem();
      setSuccess("Item excluido com sucesso.");
      await loadPeriodData(selectedMonth);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir item");
    } finally {
      setDeletingItemId(null);
    }
  }

  function toPtDate(iso: string): string {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  const batchesByEditor = useMemo(() => {
    const grouped = new Map<string, QualityRecordsResponse["batches"]>();
    for (const batch of batches) {
      const list = grouped.get(batch.editorId) ?? [];
      list.push(batch);
      grouped.set(batch.editorId, list);
    }
    return grouped;
  }, [batches]);

  return (
    <div className="qualidade-page">
      <div className="qualidade-grid">
        <section className="qualidade-card qualidade-form-card">
          <h2 className="qualidade-card-title">Registrar Levas por Editor</h2>

          {error ? <div className="form-error">{error}</div> : null}
          {success ? <div className="form-success">{success}</div> : null}

          <div className="form-group">
            <label>Editor</label>
            <select value={selectedEditorId} onChange={(e) => setSelectedEditorId(e.target.value)} className="form-input">
              <option value="">Selecione o editor</option>
              {activeEditors.map((editor) => (
                <option key={editor.id} value={editor.id}>
                  {editor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Data</label>
            <input
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="qualidade-leva-header">
            <span>Levas ({levaItems.length}/30)</span>
            <button type="button" className="btn btn-ghost" onClick={addLeva} disabled={levaItems.length >= 30}>
              + Adicionar Leva
            </button>
          </div>

          <div className="qualidade-levas-list">
            {levaItems.map((item, index) => (
              <div className="qualidade-leva-item" key={item.id}>
                <div className="qualidade-leva-top">
                  <strong>Leva #{index + 1}</strong>
                  <button type="button" className="icon-btn" onClick={() => removeLeva(item.id)}>
                    Excluir
                  </button>
                </div>
                <div className="qualidade-leva-grid">
                  <div className="form-group">
                    <label>Projeto</label>
                    <input
                      className="form-input"
                      placeholder="Nome do projeto"
                      value={item.project}
                      onChange={(e) => updateLeva(item.id, { project: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Numero da Leva</label>
                    <input
                      className="form-input"
                      placeholder="1"
                      value={item.levaNumber}
                      onChange={(e) => updateLeva(item.id, { levaNumber: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Formato</label>
                    <select
                      className="form-input"
                      value={item.format}
                      onChange={(e) => updateLeva(item.id, { format: e.target.value as QualityFormat })}
                    >
                      <option value="IG">IG</option>
                      <option value="GO">GO</option>
                      <option value="YT">YT</option>
                      <option value="FB">FB</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Nota</label>
                    <div className="qualidade-note-actions">
                      {[1, 2, 3, 4, 5].map((note) => (
                        <button
                          key={note}
                          type="button"
                          className={`quality-note-btn ${item.note === note ? "active" : ""}`}
                          onClick={() => updateLeva(item.id, { note: note as 1 | 2 | 3 | 4 | 5 })}
                        >
                          {note}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="qualidade-form-actions">
            <button type="button" className="btn btn-primary qualidade-save-btn" onClick={() => void onSaveBatch()} disabled={saving}>
              {saving ? "Salvando..." : editingBatchId ? "Salvar alteracoes do lote" : "+ Salvar Qualidade"}
            </button>
            {editingBatchId ? (
              <button type="button" className="btn btn-ghost qualidade-save-btn" onClick={resetBatchForm} disabled={saving}>
                Cancelar edicao
              </button>
            ) : null}
          </div>
        </section>

        <aside className="qualidade-side">
          <section className="qualidade-card">
            <h3 className="qualidade-side-title">Calculo em Tempo Real</h3>
            <div className="qualidade-metric-row">
              <span>Pontos</span>
              <strong>
                {realtime.points}/{realtime.maxPoints}
              </strong>
            </div>
            <div className="qualidade-progress">
              <div className="qualidade-progress-fill" style={{ width: `${Math.min(realtime.accuracyPercent, 100)}%` }} />
            </div>
            <div className="qualidade-metric-row muted">
              <span>{realtime.accuracyPercent.toFixed(1)}%</span>
              <span>{realtime.totalLevas} leva(s)</span>
            </div>
            <div className="qualidade-live-bonus">{formatBRLFromCents(realtime.bonusCents)}</div>
          </section>

          <section className="qualidade-card">
            <h3 className="qualidade-side-title">Tabela Var. 02</h3>
            <div className="qualidade-range-row"><span>80-100%</span><strong>R$ 600,00</strong></div>
            <div className="qualidade-range-row"><span>70-79%</span><strong>R$ 500,00</strong></div>
            <div className="qualidade-range-row"><span>60-69%</span><strong>R$ 400,00</strong></div>
            <div className="qualidade-range-row"><span>50-59%</span><strong>R$ 250,00</strong></div>
            <div className="qualidade-range-row"><span>40-49%</span><strong>R$ 100,00</strong></div>
            <div className="qualidade-range-row"><span>30-39%</span><strong>R$ 50,00</strong></div>
            <div className="qualidade-range-row"><span>0-29%</span><strong>R$ 0,00</strong></div>
          </section>
        </aside>
      </div>

      <section className="qualidade-card qualidade-records-card">
        <div className="qualidade-records-head">
          <h2 className="qualidade-card-title">Registros do Periodo</h2>
          <div className="qualidade-records-controls">
            <select className="filter-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
            <span className="records-count">{summary?.totalEditors ?? records.length} editores</span>
          </div>
        </div>

        {loading ? <div className="config-loading">Carregando...</div> : null}

        <div className="quality-table-wrap">
          <div className="quality-table-head quality-records-grid">
            <div>Editor</div>
            <div>Levas</div>
            <div>Pontos</div>
            <div>Maximo</div>
            <div>Precisao</div>
            <div>Bonus</div>
          </div>
          {records.map((row) => (
            <div key={row.editorId} className="quality-row-block">
              <div className="quality-table-row quality-records-grid">
                <div className="qualidade-editor-cell quality-editor-cell-stack">
                  <div className="qualidade-editor-main">
                    <span className={`mini-avatar ${row.editorColorClass}`}>{row.editorInitials}</span>
                    <span>{row.editorName}</span>
                  </div>
                  <button
                    type="button"
                    className="quality-dropdown-toggle"
                    onClick={() =>
                      setOpenByEditorId((prev) => ({
                        ...prev,
                        [row.editorId]: !prev[row.editorId],
                      }))
                    }
                  >
                    {openByEditorId[row.editorId] ? "Ocultar levas" : "Ver levas entregues"}
                  </button>
                </div>
                <div>{row.totalLevas}</div>
                <div>{row.totalPoints}</div>
                <div>{row.maxPoints}</div>
                <div className="precision-green">{row.accuracyPercent.toFixed(1)}%</div>
                <div className="money-green">{formatBRLFromCents(row.bonusCents)}</div>
              </div>

              {openByEditorId[row.editorId] ? (
                <div className="quality-editor-dropdown">
                  {(batchesByEditor.get(row.editorId) ?? []).length === 0 ? (
                    <div className="quality-dropdown-empty">Nenhuma leva detalhada para este editor.</div>
                  ) : (
                    (batchesByEditor.get(row.editorId) ?? []).map((batch) => (
                      <div key={batch.id} className="quality-batch-card">
                        <div className="quality-batch-head">
                          <span>{toPtDate(batch.date)}</span>
                          <span>
                            {batch.totalPoints}/{batch.maxPoints} - {formatBRLFromCents(batch.bonusCents)}
                          </span>
                        </div>
                        <div className="quality-batch-actions">
                          <button type="button" className="btn btn-ghost btn-xs" onClick={() => startEditBatch(batch)}>
                            Editar lote
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            onClick={() => void onDeleteBatch(batch.id)}
                            disabled={deletingBatchId === batch.id}
                          >
                            {deletingBatchId === batch.id ? "Excluindo..." : "Excluir lote"}
                          </button>
                        </div>
                        <div className="quality-batch-items">
                          {batch.items.map((item) => (
                            <div key={item.id} className="quality-batch-item-row">
                              {editingItemId === item.id && editingItemBatchId === batch.id && editingItemDraft ? (
                                <>
                                  <input
                                    className="form-input quality-inline-input"
                                    value={editingItemDraft.project}
                                    onChange={(e) => setEditingItemDraft((prev) => (prev ? { ...prev, project: e.target.value } : prev))}
                                  />
                                  <input
                                    className="form-input quality-inline-input"
                                    value={editingItemDraft.levaNumber}
                                    onChange={(e) =>
                                      setEditingItemDraft((prev) => (prev ? { ...prev, levaNumber: e.target.value } : prev))
                                    }
                                  />
                                  <select
                                    className="form-input quality-inline-input"
                                    value={editingItemDraft.format}
                                    onChange={(e) =>
                                      setEditingItemDraft((prev) => (prev ? { ...prev, format: e.target.value as QualityFormat } : prev))
                                    }
                                  >
                                    <option value="IG">IG</option>
                                    <option value="GO">GO</option>
                                    <option value="YT">YT</option>
                                    <option value="FB">FB</option>
                                  </select>
                                  <div className="quality-note-actions">
                                    {[1, 2, 3, 4, 5].map((note) => (
                                      <button
                                        key={note}
                                        type="button"
                                        className={`quality-note-btn ${editingItemDraft.note === note ? "active" : ""}`}
                                        onClick={() =>
                                          setEditingItemDraft((prev) => (prev ? { ...prev, note: note as 1 | 2 | 3 | 4 | 5 } : prev))
                                        }
                                      >
                                        {note}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="quality-item-actions">
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-xs"
                                      onClick={() => void onSaveItem(batch.id, item.id)}
                                      disabled={savingItemId === item.id}
                                    >
                                      {savingItemId === item.id ? "Salvando..." : "Salvar"}
                                    </button>
                                    <button type="button" className="btn btn-ghost btn-xs" onClick={cancelEditItem}>
                                      Cancelar
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <span>{item.project}</span>
                                  <span>Leva {item.levaNumber}</span>
                                  <span>{item.format}</span>
                                  <span>Nota {item.note}</span>
                                  <div className="quality-item-actions">
                                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => startEditItem(batch.id, item)}>
                                      Editar item
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-xs"
                                      onClick={() => void onDeleteItem(batch.id, item.id)}
                                      disabled={deletingItemId === item.id}
                                    >
                                      {deletingItemId === item.id ? "Excluindo..." : "Excluir item"}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          ))}
          {!loading && records.length === 0 ? <div className="qualidade-empty">Nenhum registro para o periodo selecionado.</div> : null}
        </div>
      </section>
    </div>
  );
}
