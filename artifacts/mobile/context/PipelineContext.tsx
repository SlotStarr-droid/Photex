import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  JobStatus,
  ModelVersion,
  PipelineStatus,
  ProcessingJob,
} from "@/types/image";
import { analyzeImage } from "@/utils/analyze";
import { generateId } from "@/utils/analyze";
import { BUILT_IN_TEMPLATES, getTemplateById } from "@/utils/prompts";
import { useImages } from "@/context/ImageContext";

const PIPELINE_QUEUE_KEY = "image_intelligence_pipeline_queue";
const PIPELINE_STATUS_KEY = "image_intelligence_pipeline_status";

interface PipelineContextValue {
  queue: ProcessingJob[];
  pipelineStatus: PipelineStatus;
  selectedTemplateId: string;
  selectedModel: ModelVersion;
  setSelectedTemplate: (id: string) => void;
  setSelectedModel: (model: ModelVersion) => void;
  enqueue: (
    imageIds: string[],
    templateId?: string,
    modelVersion?: ModelVersion,
    highPriority?: boolean,
  ) => void;
  removeJob: (jobId: string) => void;
  retryJob: (jobId: string) => void;
  pausePipeline: () => void;
  resumePipeline: () => void;
  clearCompleted: () => void;
  cancelAll: () => void;
  buildReport: () => string;
  queuedCount: number;
  runningCount: number;
  completedCount: number;
  failedCount: number;
}

const PipelineContext = createContext<PipelineContextValue | null>(null);

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error("usePipeline must be used within PipelineProvider");
  return ctx;
}

function makeId() {
  return generateId();
}

export function PipelineProvider({ children }: { children: React.ReactNode }) {
  const { images, updateImage } = useImages();

  // ── State ─────────────────────────────────────────────────────────────────
  const [queue, setQueueState] = useState<ProcessingJob[]>([]);
  const [pipelineStatus, setPipelineStatusState] =
    useState<PipelineStatus>("idle");
  const [selectedTemplateId, setSelectedTemplateId] = useState("general");
  const [selectedModel, setSelectedModel] = useState<ModelVersion>("gpt-4o");

  // Refs mirror state to avoid stale closures in the runner loop
  const queueRef = useRef<ProcessingJob[]>([]);
  const statusRef = useRef<PipelineStatus>("idle");
  const processingRef = useRef(false);
  const imagesRef = useRef(images);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // ── Persistence helpers ───────────────────────────────────────────────────
  const setQueue = useCallback(
    (updater: ProcessingJob[] | ((prev: ProcessingJob[]) => ProcessingJob[])) => {
      setQueueState((prev) => {
        const next =
          typeof updater === "function" ? updater(prev) : updater;
        queueRef.current = next;
        void AsyncStorage.setItem(PIPELINE_QUEUE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const setPipelineStatus = useCallback((status: PipelineStatus) => {
    statusRef.current = status;
    setPipelineStatusState(status);
    void AsyncStorage.setItem(PIPELINE_STATUS_KEY, status);
  }, []);

  // ── Load persisted queue on mount ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [queueRaw, statusRaw] = await Promise.all([
          AsyncStorage.getItem(PIPELINE_QUEUE_KEY),
          AsyncStorage.getItem(PIPELINE_STATUS_KEY),
        ]);
        if (queueRaw) {
          const parsed = JSON.parse(queueRaw) as ProcessingJob[];
          // Any "running" jobs from a previous session become "queued" again
          const recovered = parsed.map((j) =>
            j.status === "running" ? { ...j, status: "queued" as JobStatus, startedAt: undefined } : j,
          );
          queueRef.current = recovered;
          setQueueState(recovered);
        }
        // Always start as paused after a reload — user explicitly resumes
        const restored =
          statusRaw === "running" ? "paused" : (statusRaw as PipelineStatus) ?? "idle";
        statusRef.current = restored;
        setPipelineStatusState(restored);
      } catch {
        // ignore
      }
    };
    void load();
  }, []);

  // ── Runner loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (pipelineStatus !== "running") return;

    const interval = setInterval(() => {
      if (processingRef.current) return;
      if (statusRef.current !== "running") return;

      const nextJob = queueRef.current.find((j) => j.status === "queued");
      if (!nextJob) return;

      processingRef.current = true;

      const run = async () => {
        // Mark as running
        setQueue((prev) =>
          prev.map((j) =>
            j.id === nextJob.id
              ? { ...j, status: "running", startedAt: new Date().toISOString() }
              : j,
          ),
        );

        try {
          const image = imagesRef.current.find(
            (img) => img.id === nextJob.imageId,
          );
          if (!image) throw new Error("Image not found in library");

          const template = getTemplateById(nextJob.templateId);

          // Save previous analysis to history before overwriting
          if (image.analysis) {
            await updateImage(image.id, {
              analysisHistory: [
                ...(image.analysisHistory ?? []),
                image.analysis,
              ],
            });
          }

          const analysis = await analyzeImage(
            image.uri,
            image.metadata.mimeType ?? "image/jpeg",
            {
              model: nextJob.modelVersion,
              systemPrompt: template.systemPrompt,
              templateId: nextJob.templateId,
            },
          );

          await updateImage(nextJob.imageId, {
            analysis,
            status: "complete",
            error: undefined,
          });

          setQueue((prev) =>
            prev.map((j) =>
              j.id === nextJob.id
                ? {
                    ...j,
                    status: "completed",
                    completedAt: new Date().toISOString(),
                  }
                : j,
            ),
          );
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : "Unknown error";
          setQueue((prev) =>
            prev.map((j) =>
              j.id === nextJob.id
                ? {
                    ...j,
                    status: "failed",
                    error: errorMsg,
                    completedAt: new Date().toISOString(),
                  }
                : j,
            ),
          );
        } finally {
          processingRef.current = false;
        }
      };

      void run();
    }, 800);

    return () => clearInterval(interval);
  }, [pipelineStatus, setQueue, updateImage]);

  // ── Public API ────────────────────────────────────────────────────────────
  const enqueue = useCallback(
    (
      imageIds: string[],
      templateId = selectedTemplateId,
      modelVersion: ModelVersion = selectedModel,
      highPriority = false,
    ) => {
      const now = new Date().toISOString();
      const newJobs: ProcessingJob[] = imageIds.map((imageId, i) => ({
        id: makeId(),
        imageId,
        templateId,
        modelVersion,
        status: "queued",
        priority: highPriority ? i : 100 + i,
        queuedAt: now,
      }));

      setQueue((prev) => {
        // Deduplicate: don't add if same imageId + templateId + model already queued/running
        const dupeSet = new Set(
          prev
            .filter((j) => j.status === "queued" || j.status === "running")
            .map((j) => `${j.imageId}:${j.templateId}:${j.modelVersion}`),
        );
        const unique = newJobs.filter(
          (j) =>
            !dupeSet.has(
              `${j.imageId}:${j.templateId}:${j.modelVersion}`,
            ),
        );
        if (unique.length === 0) return prev;
        const merged = [...prev, ...unique].sort(
          (a, b) => a.priority - b.priority,
        );
        return merged;
      });

      // Auto-start pipeline if idle
      if (statusRef.current === "idle") {
        setPipelineStatus("running");
      }
    },
    [selectedTemplateId, selectedModel, setQueue, setPipelineStatus],
  );

  const removeJob = useCallback(
    (jobId: string) => {
      setQueue((prev) => prev.filter((j) => j.id !== jobId));
    },
    [setQueue],
  );

  const retryJob = useCallback(
    (jobId: string) => {
      setQueue((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status: "queued",
                error: undefined,
                startedAt: undefined,
                completedAt: undefined,
                queuedAt: new Date().toISOString(),
              }
            : j,
        ),
      );
      if (statusRef.current === "idle" || statusRef.current === "paused") {
        setPipelineStatus("running");
      }
    },
    [setQueue, setPipelineStatus],
  );

  const pausePipeline = useCallback(() => {
    setPipelineStatus("paused");
  }, [setPipelineStatus]);

  const resumePipeline = useCallback(() => {
    setPipelineStatus("running");
  }, [setPipelineStatus]);

  const clearCompleted = useCallback(() => {
    setQueue((prev) =>
      prev.filter(
        (j) => j.status !== "completed" && j.status !== "cancelled",
      ),
    );
  }, [setQueue]);

  const cancelAll = useCallback(() => {
    setPipelineStatus("idle");
    setQueue((prev) =>
      prev.map((j) =>
        j.status === "queued"
          ? { ...j, status: "cancelled" as JobStatus }
          : j,
      ),
    );
  }, [setQueue, setPipelineStatus]);

  const buildReport = useCallback((): string => {
    const q = queueRef.current;
    const imgs = imagesRef.current;
    const completed = q.filter((j) => j.status === "completed");
    const failed = q.filter((j) => j.status === "failed");

    const durations = completed
      .filter((j) => j.startedAt && j.completedAt)
      .map(
        (j) =>
          new Date(j.completedAt!).getTime() -
          new Date(j.startedAt!).getTime(),
      );
    const avgMs =
      durations.length > 0
        ? Math.round(
            durations.reduce((a, b) => a + b, 0) / durations.length,
          )
        : 0;

    const lines = [
      `# AI Pipeline Report — ${new Date().toLocaleString()}`,
      ``,
      `Total: ${q.length}  Completed: ${completed.length}  Failed: ${failed.length}  Avg: ${Math.round(avgMs / 1000)}s`,
      ``,
    ];

    for (const j of completed) {
      const img = imgs.find((i) => i.id === j.imageId);
      const name = img?.metadata.fileName ?? `img-${j.imageId.slice(-6)}`;
      const t = getTemplateById(j.templateId);
      lines.push(`✓ ${name} [${t.name}/${j.modelVersion}]`);
      if (img?.analysis) {
        lines.push(`  ${img.analysis.description.slice(0, 120)}`);
        lines.push(`  Tags: ${img.analysis.tags.slice(0, 5).join(", ")}`);
      }
    }

    for (const j of failed) {
      const img = imgs.find((i) => i.id === j.imageId);
      const name = img?.metadata.fileName ?? `img-${j.imageId.slice(-6)}`;
      lines.push(`✗ ${name} — ${j.error ?? "Unknown"}`);
    }

    return lines.join("\n");
  }, []);

  // ── Derived counts ────────────────────────────────────────────────────────
  const queuedCount = queue.filter((j) => j.status === "queued").length;
  const runningCount = queue.filter((j) => j.status === "running").length;
  const completedCount = queue.filter((j) => j.status === "completed").length;
  const failedCount = queue.filter((j) => j.status === "failed").length;

  return (
    <PipelineContext.Provider
      value={{
        queue,
        pipelineStatus,
        selectedTemplateId,
        selectedModel,
        setSelectedTemplate: setSelectedTemplateId,
        setSelectedModel,
        enqueue,
        removeJob,
        retryJob,
        pausePipeline,
        resumePipeline,
        clearCompleted,
        cancelAll,
        buildReport,
        queuedCount,
        runningCount,
        completedCount,
        failedCount,
      }}
    >
      {children}
    </PipelineContext.Provider>
  );
}
