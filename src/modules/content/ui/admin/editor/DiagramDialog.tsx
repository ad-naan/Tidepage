"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Plus, Sparkles, X } from "lucide-react";
import {
  diagramSchema,
  type MiniDiagram as Diagram,
  type DiagramNode,
} from "@/shared/contracts/diagram";
import { MiniDiagram } from "@/shared/ui/drawing/MiniDiagram";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Input } from "@/shared/ui/field/Input";
import { Textarea } from "@/shared/ui/field/Textarea";
import { Field } from "@/shared/ui/field/Field";
import { Select } from "@/shared/ui/select/Select";
import { Disclosure } from "@/shared/ui/disclosure/Disclosure";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import { Anchor } from "@/shared/ui/link/Anchor";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import { apiSend } from "@/shared/http/client";
import { isLocale, defaultLocale, type Locale } from "@/shared/i18n/config";
import { catalogs } from "@/i18n/catalogs";
import styles from "./DiagramDialog.module.css";

type DiagramDialogProps = {
  initial?: Diagram;
  context: string;
  aiEnabled: boolean;
  contentLocale?: Locale;
  onClose: () => void;
  onSave: (diagram: Diagram) => boolean;
};
type TemplateCopy = Awaited<
  ReturnType<(typeof catalogs)[Locale]>
>["default"]["diagrams"]["template"];

export function DiagramDialog(props: DiagramDialogProps) {
  const uiLocale = useLocale();
  const language =
    props.contentLocale ?? (isLocale(uiLocale) ? uiLocale : defaultLocale);
  const t = useTranslations("diagrams");
  const [copy, setCopy] = useState<{
    locale: Locale;
    value: TemplateCopy;
  } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void catalogs[language]()
      .then((catalog) => {
        if (active)
          setCopy({
            locale: language,
            value: catalog.default.diagrams.template,
          });
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, [language]);
  if (!copy || copy.locale !== language)
    return (
      <Dialog title={t("title")} wide onClose={props.onClose}>
        {loadFailed ? (
          <p role="alert">{t("loadFailed")}</p>
        ) : (
          <LoadingSkeleton variant="document" />
        )}
      </Dialog>
    );
  return (
    <DiagramEditor
      key={language}
      {...props}
      contentLocale={language}
      templateCopy={copy.value}
    />
  );
}

function DiagramEditor({
  initial,
  context,
  aiEnabled,
  contentLocale,
  onClose,
  onSave,
  templateCopy,
}: DiagramDialogProps & { templateCopy: TemplateCopy }) {
  const t = useTranslations("diagrams");
  const locale = useLocale();
  const id = useId();
  function template(kind: "flow" | "branch" | "cycle"): Diagram {
    const labels =
      kind === "branch"
        ? [
            templateCopy.start,
            templateCopy.check,
            templateCopy.yes,
            templateCopy.no,
          ]
        : [templateCopy.idea, templateCopy.draft, templateCopy.publish];
    return {
      version: 1,
      title: templateCopy[kind],
      caption: "",
      direction: "vertical",
      nodes: labels.map((label, index) => ({
        id: `n${index + 1}`,
        label,
        shape:
          kind === "branch" && index === 1
            ? "decision"
            : index === 0
              ? "pill"
              : "box",
        tone: index === labels.length - 1 ? "warm" : "ink",
      })),
      edges:
        kind === "branch"
          ? [
              { from: "n1", to: "n2", label: "" },
              { from: "n2", to: "n3", label: "" },
              { from: "n2", to: "n4", label: "" },
            ]
          : [
              { from: "n1", to: "n2", label: "" },
              { from: "n2", to: "n3", label: "" },
              ...(kind === "cycle"
                ? [{ from: "n3", to: "n1", label: "" }]
                : []),
            ],
    };
  }
  const [value, setValue] = useState<Diagram>(
    () => initial ?? template("flow"),
  );
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const valid = diagramSchema.safeParse(value);
  useEffect(() => () => request.current?.abort(), []);

  function change(next: Diagram) {
    setValue(next);
    setError(null);
  }
  function nodeChange(nodeId: string, patch: Partial<DiagramNode>) {
    change({
      ...value,
      nodes: value.nodes.map((node) =>
        node.id === nodeId ? { ...node, ...patch } : node,
      ),
    });
  }
  async function generate() {
    if (!prompt.trim() || busy || !valid.success) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    try {
      const result = await apiSend<unknown>(
        "/api/v1/ai/diagram",
        "POST",
        { prompt, locale: contentLocale ?? locale, context, diagram: value },
        { signal: controller.signal, timeoutMs: 65000 },
      );
      if (!controller.signal.aborted) {
        setValue(diagramSchema.parse(result));
        setPrompt("");
      }
    } catch {
      if (!controller.signal.aborted) setError(t("generationFailed"));
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }
  function stop() {
    request.current?.abort();
    request.current = null;
    setBusy(false);
  }
  function exportSvg() {
    const original = preview.current?.querySelector("svg");
    if (!original) return;
    const copy = original.cloneNode(true) as SVGSVGElement;
    const computed = getComputedStyle(original);
    for (const key of [
      "--ink",
      "--paper",
      "--accent",
      "--diagram-sea",
      "--font-diagram",
    ])
      copy.style.setProperty(key, computed.getPropertyValue(key));
    copy.style.setProperty("--font-ui", "Arial, 'Noto Sans SC', sans-serif");
    copy.style.background = computed.getPropertyValue("--paper");
    const blob = new Blob([new XMLSerializer().serializeToString(copy)], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return url;
  }
  const nodeOptions = value.nodes.map((node) => ({
    value: node.id,
    label: node.label || node.id,
  }));
  return (
    <Dialog
      title={t("title")}
      wide
      onClose={onClose}
      headingIcon={<Sparkles size={18} />}
    >
      <div className={styles.layout}>
        <div className={styles.stage}>
          <div className={styles.stageTools}>
            <FilterTabs
              value={value.direction}
              label={t("direction")}
              variant="inline"
              busy={busy}
              options={(["horizontal", "vertical"] as const).map((key) => ({
                value: key,
                label: t(key),
              }))}
              onChange={(direction) => change({ ...value, direction })}
            />
            <Anchor
              href="#"
              download="tidepage-diagram.svg"
              className={styles.export}
              aria-label={t("export")}
              title={t("export")}
              aria-disabled={!valid.success}
              onClick={(event) => {
                const url = valid.success ? exportSvg() : undefined;
                if (url) event.currentTarget.href = url;
                else event.preventDefault();
              }}
            >
              <Download size={16} />
            </Anchor>
          </div>
          <div
            ref={preview}
            className={styles.preview}
            data-custom-scroll={t("preview")}
          >
            <MiniDiagram value={value} />
          </div>
          {aiEnabled ? (
            <div className={styles.assistant}>
              <Field
                id={`${id}-prompt`}
                label={t("prompt")}
                description={context ? t("withContext") : t("withoutContext")}
              >
                <Textarea
                  rows={2}
                  maxLength={2000}
                  value={prompt}
                  disabled={busy}
                  placeholder={t("promptPlaceholder")}
                  onChange={(event) => setPrompt(event.target.value)}
                />
              </Field>
              <div className={styles.aiActions}>
                {busy ? (
                  <Button size="sm" variant="quiet" onClick={stop}>
                    {t("stop")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="quiet"
                    disabled={!prompt.trim() || !valid.success}
                    onClick={() => void generate()}
                  >
                    <Sparkles size={14} />
                    {t("generate")}
                  </Button>
                )}
                <span role="status">{busy ? t("generating") : ""}</span>
              </div>
            </div>
          ) : (
            <p className={styles.help}>{t("aiUnavailable")}</p>
          )}
        </div>
        <div className={styles.settings}>
          {!initial && (
            <div
              className={styles.templates}
              role="group"
              aria-label={t("templates")}
            >
              {(["flow", "branch", "cycle"] as const).map((kind) => (
                <Button
                  key={kind}
                  size="sm"
                  variant="quiet"
                  disabled={busy}
                  onClick={() => change(template(kind))}
                >
                  {t(`templatesList.${kind}`)}
                </Button>
              ))}
            </div>
          )}
          <Field id={`${id}-title`} label={t("diagramTitle")}>
            <Input
              value={value.title}
              maxLength={120}
              disabled={busy}
              onChange={(event) =>
                change({ ...value, title: event.target.value })
              }
            />
          </Field>
          <Disclosure summary={t("nodes", { count: value.nodes.length })} open>
            <div className={styles.items}>
              {value.nodes.map((node, index) => (
                <div key={node.id} className={styles.node}>
                  <div className={styles.row}>
                    <span className={styles.index}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Input
                      aria-label={t("nodeLabel", { index: index + 1 })}
                      value={node.label}
                      maxLength={60}
                      disabled={busy}
                      onChange={(event) =>
                        nodeChange(node.id, { label: event.target.value })
                      }
                    />
                    <IconButton
                      aria-label={t("removeNode", { index: index + 1 })}
                      disabled={busy || value.nodes.length === 1}
                      onClick={() =>
                        change({
                          ...value,
                          nodes: value.nodes.filter(
                            (item) => item.id !== node.id,
                          ),
                          edges: value.edges.filter(
                            (edge) =>
                              edge.from !== node.id && edge.to !== node.id,
                          ),
                        })
                      }
                    >
                      <X size={14} />
                    </IconButton>
                  </div>
                  <div className={styles.nodeOptions}>
                    <Select
                      label={t("shape")}
                      value={node.shape}
                      disabled={busy}
                      options={(["box", "decision", "pill"] as const).map(
                        (key) => ({ value: key, label: t(`shapes.${key}`) }),
                      )}
                      onValueChange={(shape) => nodeChange(node.id, { shape })}
                    />
                    <Select
                      label={t("tone")}
                      value={node.tone}
                      disabled={busy}
                      options={(["ink", "warm", "sea"] as const).map((key) => ({
                        value: key,
                        label: t(`tones.${key}`),
                      }))}
                      onValueChange={(tone) => nodeChange(node.id, { tone })}
                    />
                  </div>
                </div>
              ))}
              <Button
                size="sm"
                variant="quiet"
                disabled={busy || value.nodes.length >= 12}
                onClick={() =>
                  change({
                    ...value,
                    nodes: [
                      ...value.nodes,
                      {
                        id: `n${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
                        label: templateCopy.newNode,
                        shape: "box",
                        tone: "ink",
                      },
                    ],
                  })
                }
              >
                <Plus size={14} />
                {t("addNode")}
              </Button>
            </div>
          </Disclosure>
          <Disclosure summary={t("connections", { count: value.edges.length })}>
            <div className={styles.items}>
              {value.edges.map((edge, index) => (
                <div key={index} className={styles.edge}>
                  <div className={styles.row}>
                    <Select
                      label={t("from")}
                      value={edge.from}
                      disabled={busy}
                      options={nodeOptions}
                      onValueChange={(from) =>
                        change({
                          ...value,
                          edges: value.edges.map((item, i) =>
                            i === index ? { ...item, from } : item,
                          ),
                        })
                      }
                    />
                    <span aria-hidden="true">→</span>
                    <Select
                      label={t("to")}
                      value={edge.to}
                      disabled={busy}
                      options={nodeOptions}
                      onValueChange={(to) =>
                        change({
                          ...value,
                          edges: value.edges.map((item, i) =>
                            i === index ? { ...item, to } : item,
                          ),
                        })
                      }
                    />
                    <IconButton
                      aria-label={t("removeConnection", { index: index + 1 })}
                      disabled={busy}
                      onClick={() =>
                        change({
                          ...value,
                          edges: value.edges.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <X size={14} />
                    </IconButton>
                  </div>
                  <Input
                    aria-label={t("connectionLabel", { index: index + 1 })}
                    value={edge.label}
                    maxLength={24}
                    disabled={busy}
                    placeholder={t("connectionLabelPlaceholder")}
                    onChange={(event) =>
                      change({
                        ...value,
                        edges: value.edges.map((item, i) =>
                          i === index
                            ? { ...item, label: event.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <Button
                size="sm"
                variant="quiet"
                disabled={
                  busy || value.edges.length >= 18 || value.nodes.length < 2
                }
                onClick={() => {
                  const pair = value.nodes
                    .flatMap((from) =>
                      value.nodes.map((to) => ({
                        from: from.id,
                        to: to.id,
                        label: "",
                      })),
                    )
                    .find(
                      (edge) =>
                        edge.from !== edge.to &&
                        !value.edges.some(
                          (item) =>
                            item.from === edge.from && item.to === edge.to,
                        ),
                    );
                  if (pair) change({ ...value, edges: [...value.edges, pair] });
                }}
              >
                <Plus size={14} />
                {t("addConnection")}
              </Button>
            </div>
          </Disclosure>
          <Field id={`${id}-caption`} label={t("caption")}>
            <Textarea
              rows={2}
              value={value.caption}
              maxLength={300}
              disabled={busy}
              onChange={(event) =>
                change({ ...value, caption: event.target.value })
              }
            />
          </Field>
        </div>
      </div>
      {(!valid.success || error) && (
        <p className={styles.error} role="alert">
          {error ?? t("invalid")}
        </p>
      )}
      <div className={styles.footer}>
        <span>{t("editable")}</span>
        <Button
          variant="primary"
          size="sm"
          disabled={busy || !valid.success}
          onClick={() => {
            if (valid.success && !onSave(valid.data))
              setError(t("documentChanged"));
          }}
        >
          {t(initial ? "update" : "insert")}
        </Button>
      </div>
    </Dialog>
  );
}
