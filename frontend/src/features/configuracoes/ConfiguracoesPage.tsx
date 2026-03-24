import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { DeliveryType, Editor } from "../entregas/mockData";
import "./configuracoes.css";
import { apiRequest as authApiRequest } from "../../lib/api";

type CargoOption =
  | "Junior 01"
  | "Junior 02"
  | "Pleno 01"
  | "Pleno 02"
  | "Pleno 03"
  | "Senior 01"
  | "Senior 02";

const CARGO_OPTIONS: CargoOption[] = [
  "Junior 01",
  "Junior 02",
  "Pleno 01",
  "Pleno 02",
  "Pleno 03",
  "Senior 01",
  "Senior 02",
];

type CreateOrUpdateEditorForm = {
  name: string;
  initials: string;
  role: CargoOption | "";
  productionType: "VSL" | "Criativos" | "VSL + Criativos" | "";
  salaryFixed: string;
};

function buildInitialsFromName(nome: string) {
  const words = nome.split(" ").filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  if (words.length === 1 && words[0].length === 1) {
    return words[0][0].toUpperCase();
  }
  return "??";
}

export default function ConfiguracoesPage(props: { onEditorsChanged?: () => void | Promise<void>; onUnauthorized?: () => void }) {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const token = localStorage.getItem("auth_token");

  const [activeTab, setActiveTab] = useState<"editores" | "valores">("editores");
  const [loading, setLoading] = useState(true);
  const [togglingEditorId, setTogglingEditorId] = useState<string | null>(null);

  const [editors, setEditors] = useState<Editor[]>([]);

  const RATE_TYPES: DeliveryType[] = useMemo(() => ["VSL", "Lead", "ML", "Troca", "Upsell"], []);

  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState("");
  const [ratesSuccess, setRatesSuccess] = useState("");
  const [creativeRatesDraft, setCreativeRatesDraft] = useState<{ video: string; image: string }>({
    video: "",
    image: "",
  });
  const [ratesDraft, setRatesDraft] = useState<Record<DeliveryType, string>>({
    VSL: "",
    Lead: "",
    ML: "",
    Troca: "",
    Upsell: "",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState<CreateOrUpdateEditorForm>({
    name: "",
    initials: "",
    role: "",
    productionType: "",
    salaryFixed: "",
  });

  const initialsPreview = useMemo(() => {
    const fromNick = form.initials.trim();
    if (fromNick) return fromNick.toUpperCase();
    return buildInitialsFromName(form.name);
  }, [form.name, form.initials]);

  function formatCentsToPtBR(cents: number) {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  }

  function parsePtBRMoneyToCents(raw: string): number | null {
    const s = raw.trim();
    if (!s) return null;

    // Permitir digitar apenas números e separadores.
    const cleaned = s.replace(/[^\d.,]/g, "");
    if (!cleaned) return null;
    if (!/\d/.test(cleaned)) return null;

    // Ex: 1.230,90 -> 1230,90 -> 1230.90
    const withoutThousands = cleaned.replace(/\./g, "");
    const normalized = withoutThousands.replace(",", ".");
    const asNumber = Number(normalized);
    if (!Number.isFinite(asNumber)) return null;

    return Math.round(asNumber * 100);
  }

  async function loadEditors() {
    if (!token) return;
    setLoading(true);
    try {
      const data = await authApiRequest<Editor[]>({ apiUrl, path: "/editors", token, onUnauthorized: props.onUnauthorized });
      setEditors(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar editores";
      setFormError(message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEditors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadRates() {
    if (!token) return;
    setRatesLoading(true);
    setRatesError("");
    try {
      const [data, creativeRates] = await Promise.all([
        authApiRequest<Array<{ type: DeliveryType; baseValue: number }>>({ apiUrl, path: "/rates", token, onUnauthorized: props.onUnauthorized }),
        authApiRequest<{ video: number; image: number }>({ apiUrl, path: "/ad-creatives/rates", token, onUnauthorized: props.onUnauthorized }),
      ]);

      setRatesDraft(
        data.reduce((acc, item) => {
          acc[item.type] = formatCentsToPtBR(item.baseValue);
          return acc;
        }, { VSL: "", Lead: "", ML: "", Troca: "", Upsell: "" } as Record<DeliveryType, string>)
      );

      setCreativeRatesDraft({
        video: formatCentsToPtBR(creativeRates.video),
        image: formatCentsToPtBR(creativeRates.image),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar valores de entrega";
      setRatesError(message);
      console.error(error);
    } finally {
      setRatesLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab !== "valores") return;
    void loadRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token]);

  function openNewEditorModal() {
    setEditingId(null);
    setFormError("");
    setForm({ name: "", initials: "", role: "", productionType: "", salaryFixed: "" });
    setModalOpen(true);
  }

  function openEditEditorModal(editor: Editor) {
    setEditingId(editor.id);
    setFormError("");
    setForm({
      name: editor.name,
      initials: editor.initials,
      role: editor.role as CargoOption,
      productionType: (editor.productionType as CreateOrUpdateEditorForm["productionType"]) ?? "",
      salaryFixed: editor.salaryFixed == null ? "" : String(editor.salaryFixed),
    });
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!token) {
      setFormError("Sessao expirada. Faça login novamente.");
      return;
    }

    const name = form.name.trim();
    const initials = form.initials.trim();
    const role = form.role;
    const productionType = form.productionType;
    const salaryFixedStr = form.salaryFixed.trim();
    const salaryFixed = salaryFixedStr ? Number(salaryFixedStr) : NaN;

    if (!name) {
      setFormError("Informe o nome completo.");
      return;
    }

    if (!initials) {
      setFormError("Informe o nickname (iniciais).");
      return;
    }

    if (!role) {
      setFormError("Selecione o cargo.");
      return;
    }

    if (!productionType) {
      setFormError("Selecione o tipo de produção.");
      return;
    }

    if (!salaryFixedStr || Number.isNaN(salaryFixed) || salaryFixed < 0) {
      setFormError("Informe o salário fixo (R$) como número inteiro.");
      return;
    }

    const payload = { name, initials, role, salaryFixed, productionType };

    try {
      if (editingId) {
        await authApiRequest<Editor>({
          apiUrl,
          path: `/editors/${editingId}`,
          token,
          onUnauthorized: props.onUnauthorized,
          init: { method: "PATCH", body: JSON.stringify(payload) },
        });
      } else {
        await authApiRequest<Editor>({
          apiUrl,
          path: "/editors",
          token,
          onUnauthorized: props.onUnauthorized,
          init: { method: "POST", body: JSON.stringify(payload) },
        });
      }

      setModalOpen(false);
      setEditingId(null);
      setFormError("");
      void loadEditors();
      await props.onEditorsChanged?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar editor";
      setFormError(message);
    }
  }

  async function onToggleEditorStatus(editor: Editor) {
    if (togglingEditorId) return;

    try {
      setFormError("");
      setTogglingEditorId(editor.id);
      await authApiRequest<Editor>({
        apiUrl,
        path: `/editors/${editor.id}/status`,
        token,
        onUnauthorized: props.onUnauthorized,
        init: {
          method: "PATCH",
          body: JSON.stringify({ isActive: !editor.isActive }),
        },
      });
      void loadEditors();
      await props.onEditorsChanged?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar status do editor";
      setFormError(message);
    } finally {
      setTogglingEditorId(null);
    }
  }

  return (
    <div className="config-root">
      <div className="config-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <div className="page-subtitle">Gerencie editores e cargos</div>
        </div>
      </div>

      <div className="config-tabs">
        <div
          className={`config-tab ${activeTab === "editores" ? "active" : ""}`}
          onClick={() => setActiveTab("editores")}
        >
          Editores
        </div>
        <div
          className={`config-tab ${activeTab === "valores" ? "active" : ""}`}
          onClick={() => setActiveTab("valores")}
        >
          Valores de Entrega
        </div>
      </div>

      {activeTab === "editores" && (
        <section className="config-section">
          <div className="config-section-header">
            <div className="config-section-title">Editores Cadastrados</div>
            <div className="config-section-action" onClick={openNewEditorModal}>
              + novo editor
            </div>
          </div>

          {loading ? (
            <div className="config-loading">Carregando...</div>
          ) : (
            <div className="config-editors-list">
              {editors.map((ed) => (
                <div key={ed.id} className="config-editor-row">
                  <div className={`config-ed-avatar ${ed.colorClass}`}>
                    <span>{ed.initials}</span>
                  </div>

                  <div className="config-ed-info">
                    <div className="config-ed-name">{ed.name}</div>
                    <div className="config-ed-meta">
                      {ed.productionType ?? "---"}
                      <span className={`config-status-pill ${ed.isActive ? "active" : "inactive"}`}>
                        {ed.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>

                  <div className="config-ed-cargo">
                    <span className="config-cargo-pill">{ed.role}</span>
                  </div>

                  <div className="config-ed-actions">
                    <button
                      className="config-icon-btn"
                      type="button"
                      onClick={() => openEditEditorModal(ed)}
                      aria-label="Editar"
                      title="Editar"
                    >
                      E
                    </button>
                    <button
                      className={`config-toggle-btn ${ed.isActive ? "active" : "inactive"}`}
                      type="button"
                      onClick={() => void onToggleEditorStatus(ed)}
                      aria-label={ed.isActive ? "Desativar" : "Ativar"}
                      title={ed.isActive ? "Desativar" : "Ativar"}
                      aria-pressed={ed.isActive}
                      disabled={togglingEditorId === ed.id}
                    >
                      <span className="config-toggle-track">
                        <span className="config-toggle-thumb" />
                      </span>
                    </button>
                  </div>
                </div>
              ))}

              <div className="config-add-editor-card" onClick={openNewEditorModal}>
                <div className="config-add-icon">+</div>
                <div>
                  <div className="config-add-label">Novo Editor</div>
                  <div className="config-add-sub">Cadastrar novo membro do time</div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === "valores" && (
        <section className="config-section">
          <div className="config-section-header">
            <div className="config-section-title">Valores por Tipo</div>
            <div className="config-section-action">{ratesLoading ? "Carregando..." : "Atualize e salve"}</div>
          </div>

                  {ratesSuccess && <div className="form-success">{ratesSuccess}</div>}
                  {ratesError && <div className="form-error">{ratesError}</div>}

          <div className="config-rates-grid">
            {RATE_TYPES.map((t) => {
              const label = t === "ML" ? "Mini Lead" : t;
              return (
                <div key={t} className="config-rate-card">
                  <div className="config-rate-title">{label}</div>
                  <input
                    className="config-rate-input"
                    type="text"
                    inputMode="decimal"
                    value={ratesDraft[t]}
                    onChange={(e) => {
                      const next = e.target.value.replace(/[^\d.,]/g, "");
                      setRatesError("");
                      setRatesSuccess("");
                      setRatesDraft((prev) => ({ ...prev, [t]: next }));
                    }}
                    onBlur={() => {
                      const raw = ratesDraft[t];
                      if (!raw.trim()) return; // deixa vazio
                      const cents = parsePtBRMoneyToCents(raw);
                      if (cents == null) {
                        setRatesError("Valor inválido no campo de rates. Ex: 1.230,90");
                        return;
                      }
                      setRatesDraft((prev) => ({ ...prev, [t]: formatCentsToPtBR(cents) }));
                      setRatesError("");
                    }}
                  />
                  <div className="config-rate-sub">Valor base (R$)</div>
                </div>
              );
            })}

            <div className="config-rate-card">
              <div className="config-rate-title">Valor por Criativo de Vídeo (AD) (R$)</div>
              <input
                className="config-rate-input"
                type="text"
                inputMode="decimal"
                value={creativeRatesDraft.video}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d.,]/g, "");
                  setRatesError("");
                  setRatesSuccess("");
                  setCreativeRatesDraft((prev) => ({ ...prev, video: next }));
                }}
                onBlur={() => {
                  const raw = creativeRatesDraft.video;
                  if (!raw.trim()) return;
                  const cents = parsePtBRMoneyToCents(raw);
                  if (cents == null) {
                    setRatesError("Valor inválido no campo de Vídeo. Ex: 1.230,90");
                    return;
                  }
                  setCreativeRatesDraft((prev) => ({ ...prev, video: formatCentsToPtBR(cents) }));
                  setRatesError("");
                }}
              />
              <div className="config-rate-sub">Valor base (R$)</div>
            </div>

            <div className="config-rate-card">
              <div className="config-rate-title">Valor por Criativo de Imagem (AD) (R$)</div>
              <input
                className="config-rate-input"
                type="text"
                inputMode="decimal"
                value={creativeRatesDraft.image}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d.,]/g, "");
                  setRatesError("");
                  setRatesSuccess("");
                  setCreativeRatesDraft((prev) => ({ ...prev, image: next }));
                }}
                onBlur={() => {
                  const raw = creativeRatesDraft.image;
                  if (!raw.trim()) return;
                  const cents = parsePtBRMoneyToCents(raw);
                  if (cents == null) {
                    setRatesError("Valor inválido no campo de Imagem. Ex: 1.230,90");
                    return;
                  }
                  setCreativeRatesDraft((prev) => ({ ...prev, image: formatCentsToPtBR(cents) }));
                  setRatesError("");
                }}
              />
              <div className="config-rate-sub">Valor base (R$)</div>
            </div>
          </div>

          <div className="config-rate-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                if (!token) return;
                setRatesError("");
                setRatesSuccess("");

                const parsed: Record<DeliveryType, number> = {
                  VSL: 0,
                  Lead: 0,
                  ML: 0,
                  Troca: 0,
                  Upsell: 0,
                };

                for (const type of RATE_TYPES) {
                  const raw = ratesDraft[type]?.trim() ?? "";
                  if (!raw) {
                    setRatesError("Preencha todos os valores antes de salvar.");
                    return;
                  }

                  const cents = parsePtBRMoneyToCents(raw);
                  if (cents == null) {
                    setRatesError("Um ou mais valores estão inválidos. Ex: 1.230,90");
                    return;
                  }

                  parsed[type] = cents;
                }

                const creativeVideoCents = parsePtBRMoneyToCents(creativeRatesDraft.video.trim());
                if (creativeVideoCents == null) {
                  setRatesError("Informe o valor do criativo de Vídeo (R$). Ex: 1.230,90");
                  return;
                }

                const creativeImageCents = parsePtBRMoneyToCents(creativeRatesDraft.image.trim());
                if (creativeImageCents == null) {
                  setRatesError("Informe o valor do criativo de Imagem (R$). Ex: 1.230,90");
                  return;
                }

                try {
                  await Promise.all(
                    [
                      ...RATE_TYPES.map((type) =>
                        authApiRequest({
                          apiUrl,
                          path: "/rates",
                          token,
                          onUnauthorized: props.onUnauthorized,
                          init: {
                            method: "POST",
                            body: JSON.stringify({ type, baseValue: parsed[type] }),
                          },
                        })
                      ),
                      authApiRequest({
                        apiUrl,
                        path: "/ad-creatives/rate",
                        token,
                        onUnauthorized: props.onUnauthorized,
                        init: {
                          method: "PATCH",
                          body: JSON.stringify({ mediaType: "Video", baseValue: creativeVideoCents }),
                        },
                      }),
                      authApiRequest({
                        apiUrl,
                        path: "/ad-creatives/rate",
                        token,
                        onUnauthorized: props.onUnauthorized,
                        init: {
                          method: "PATCH",
                          body: JSON.stringify({ mediaType: "Image", baseValue: creativeImageCents }),
                        },
                      }),
                    ]
                  );
                  // Recarrega para garantir que a máscara e valores ficaram consistentes.
                  await loadRates();
                  await props.onEditorsChanged?.();
                  setRatesSuccess("Valores salvos com sucesso!");
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Erro ao salvar valores";
                  setRatesSuccess("");
                  setRatesError(message);
                }
              }}
              disabled={ratesLoading}
            >
              Salvar Valores
            </button>
          </div>
        </section>
      )}

      <div
        className={`modal-overlay ${modalOpen ? "open" : ""}`}
        style={{ opacity: modalOpen ? 1 : 0 }}
        onClick={() => setModalOpen(false)}
      >
        <form className="modal config-modal" onSubmit={onSubmit} onClick={(e) => e.stopPropagation()}>
          <div className="config-modal-top" />
          <div className="modal-title" id="modal-title-text">
            {editingId ? "Editar Editor" : "Novo Editor"}
          </div>
          <div className="modal-sub" id="modal-sub-text">
            {editingId ? "Ajuste os dados do editor" : "Preencha os dados do editor"}
          </div>

          <div className="config-form-grid">
            <div className="config-form-group config-form-full">
              <div className="form-label">Preview Monograma</div>
              <div className="avatar-preview">
                <div className="preview-avatar">
                  <span>{initialsPreview}</span>
                </div>
                <div className="preview-info">Monograma do nickname (iniciais)</div>
              </div>
            </div>

            <div className="config-form-group config-form-full">
              <div className="form-label">Nome Completo</div>
              <input
                className="form-input"
                type="text"
                placeholder="Ex: Alexandre Silva"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="config-form-group config-form-full">
              <div className="form-label">Nickname (apelido no sistema)</div>
              <input
                className="form-input"
                type="text"
                placeholder="Ex: Xande"
                value={form.initials}
                onChange={(e) => setForm((p) => ({ ...p, initials: e.target.value }))}
              />
            </div>

            <div className="config-form-group">
              <div className="form-label">Cargo</div>
              <select
                className="form-select"
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as CargoOption | "" }))}
              >
                <option value="">Selecione</option>
                {CARGO_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="config-form-group">
              <div className="form-label">Tipo de Produção</div>
              <select
                className="form-select"
                value={form.productionType}
                onChange={(e) => setForm((p) => ({ ...p, productionType: e.target.value as CreateOrUpdateEditorForm["productionType"] }))}
              >
                <option value="">Selecione</option>
                <option value="VSL">VSL</option>
                <option value="Criativos">Criativos</option>
                <option value="VSL + Criativos">VSL + Criativos</option>
              </select>
            </div>

            <div className="config-form-group config-form-full">
              <div className="form-label">Salário Fixo (R$)</div>
              <input
                className="form-input"
                type="text"
                inputMode="numeric"
                placeholder="Ex: 2750"
                value={form.salaryFixed}
                onChange={(e) => setForm((p) => ({ ...p, salaryFixed: e.target.value }))}
              />
            </div>
          </div>

          {formError && <div className="form-error">{formError}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setModalOpen(false);
                setEditingId(null);
                setFormError("");
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Salvar Editor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

