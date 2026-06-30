import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type {
  AuditEntry,
  Investigation,
  StoredImage,
  UserCorrection,
} from "@/types/image";

const IMAGES_KEY = "image_intelligence_images";
const AUDIT_KEY = "image_intelligence_audit";
const INVESTIGATIONS_KEY = "image_intelligence_investigations";
const CORRECTIONS_KEY = "image_intelligence_corrections";

interface ImageContextValue {
  images: StoredImage[];
  auditLog: AuditEntry[];
  investigations: Investigation[];
  corrections: UserCorrection[];
  addImage: (image: StoredImage) => Promise<void>;
  updateImage: (id: string, updates: Partial<StoredImage>) => Promise<void>;
  removeImage: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  addAuditEntry: (action: string, details: string, imageId?: string) => Promise<void>;
  // Investigations
  createInvestigation: (title: string, description?: string) => Promise<Investigation>;
  updateInvestigation: (id: string, updates: Partial<Investigation>) => Promise<void>;
  deleteInvestigation: (id: string) => Promise<void>;
  addImageToInvestigation: (investigationId: string, imageId: string) => Promise<void>;
  removeImageFromInvestigation: (investigationId: string, imageId: string) => Promise<void>;
  // Corrections
  addCorrection: (correction: Omit<UserCorrection, "id" | "timestamp">) => Promise<void>;
  isLoaded: boolean;
}

const ImageContext = createContext<ImageContextValue | null>(null);

function makeId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 7);
}

export function ImageProvider({ children }: { children: React.ReactNode }) {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [corrections, setCorrections] = useState<UserCorrection[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [imagesRaw, auditRaw, investigationsRaw, correctionsRaw] =
          await Promise.all([
            AsyncStorage.getItem(IMAGES_KEY),
            AsyncStorage.getItem(AUDIT_KEY),
            AsyncStorage.getItem(INVESTIGATIONS_KEY),
            AsyncStorage.getItem(CORRECTIONS_KEY),
          ]);
        if (imagesRaw) setImages(JSON.parse(imagesRaw) as StoredImage[]);
        if (auditRaw) setAuditLog(JSON.parse(auditRaw) as AuditEntry[]);
        if (investigationsRaw)
          setInvestigations(JSON.parse(investigationsRaw) as Investigation[]);
        if (correctionsRaw)
          setCorrections(JSON.parse(correctionsRaw) as UserCorrection[]);
      } catch {
        // silently ignore load errors
      } finally {
        setIsLoaded(true);
      }
    };
    void load();
  }, []);

  const saveImages = useCallback(async (updated: StoredImage[]) => {
    const withoutBase64 = updated.map(({ base64: _, ...rest }) => rest);
    await AsyncStorage.setItem(IMAGES_KEY, JSON.stringify(withoutBase64));
  }, []);

  const saveAudit = useCallback(async (updated: AuditEntry[]) => {
    await AsyncStorage.setItem(AUDIT_KEY, JSON.stringify(updated.slice(-200)));
  }, []);

  const saveInvestigations = useCallback(async (updated: Investigation[]) => {
    await AsyncStorage.setItem(INVESTIGATIONS_KEY, JSON.stringify(updated));
  }, []);

  const saveCorrections = useCallback(async (updated: UserCorrection[]) => {
    await AsyncStorage.setItem(CORRECTIONS_KEY, JSON.stringify(updated.slice(-500)));
  }, []);

  const addAuditEntry = useCallback(
    async (action: string, details: string, imageId?: string) => {
      const entry: AuditEntry = {
        id: makeId(),
        timestamp: new Date().toISOString(),
        action,
        imageId,
        details,
      };
      setAuditLog((prev) => {
        const updated = [entry, ...prev];
        void saveAudit(updated);
        return updated;
      });
    },
    [saveAudit]
  );

  const addImage = useCallback(
    async (image: StoredImage) => {
      setImages((prev) => {
        const updated = [image, ...prev];
        void saveImages(updated);
        return updated;
      });
      await addAuditEntry("IMAGE_ADDED", `Image added from ${image.source}`, image.id);
    },
    [saveImages, addAuditEntry]
  );

  const updateImage = useCallback(
    async (id: string, updates: Partial<StoredImage>) => {
      setImages((prev) => {
        const updated = prev.map((img) =>
          img.id === id ? { ...img, ...updates } : img
        );
        void saveImages(updated);
        return updated;
      });
    },
    [saveImages]
  );

  const removeImage = useCallback(
    async (id: string) => {
      setImages((prev) => {
        const updated = prev.filter((img) => img.id !== id);
        void saveImages(updated);
        return updated;
      });
      // Remove from all investigations
      setInvestigations((prev) => {
        const updated = prev.map((inv) => ({
          ...inv,
          imageIds: inv.imageIds.filter((iid) => iid !== id),
          updatedAt: new Date().toISOString(),
        }));
        void saveInvestigations(updated);
        return updated;
      });
      await addAuditEntry("IMAGE_REMOVED", `Image ${id} removed by user`, id);
    },
    [saveImages, saveInvestigations, addAuditEntry]
  );

  const clearAll = useCallback(async () => {
    setImages([]);
    await AsyncStorage.removeItem(IMAGES_KEY);
    await addAuditEntry("ALL_CLEARED", "All images cleared by user");
  }, [addAuditEntry]);

  // ---- Investigations ----

  const createInvestigation = useCallback(
    async (title: string, description = ""): Promise<Investigation> => {
      const inv: Investigation = {
        id: makeId(),
        title,
        description,
        imageIds: [],
        notes: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
      };
      setInvestigations((prev) => {
        const updated = [inv, ...prev];
        void saveInvestigations(updated);
        return updated;
      });
      await addAuditEntry("INVESTIGATION_CREATED", `Investigation "${title}" created`);
      return inv;
    },
    [saveInvestigations, addAuditEntry]
  );

  const updateInvestigation = useCallback(
    async (id: string, updates: Partial<Investigation>) => {
      setInvestigations((prev) => {
        const updated = prev.map((inv) =>
          inv.id === id
            ? { ...inv, ...updates, updatedAt: new Date().toISOString() }
            : inv
        );
        void saveInvestigations(updated);
        return updated;
      });
    },
    [saveInvestigations]
  );

  const deleteInvestigation = useCallback(
    async (id: string) => {
      setInvestigations((prev) => {
        const updated = prev.filter((inv) => inv.id !== id);
        void saveInvestigations(updated);
        return updated;
      });
      await addAuditEntry("INVESTIGATION_DELETED", `Investigation ${id} deleted`);
    },
    [saveInvestigations, addAuditEntry]
  );

  const addImageToInvestigation = useCallback(
    async (investigationId: string, imageId: string) => {
      setInvestigations((prev) => {
        const updated = prev.map((inv) =>
          inv.id === investigationId && !inv.imageIds.includes(imageId)
            ? {
                ...inv,
                imageIds: [...inv.imageIds, imageId],
                updatedAt: new Date().toISOString(),
              }
            : inv
        );
        void saveInvestigations(updated);
        return updated;
      });
      await addAuditEntry(
        "IMAGE_ADDED_TO_INVESTIGATION",
        `Image added to investigation ${investigationId}`,
        imageId
      );
    },
    [saveInvestigations, addAuditEntry]
  );

  const removeImageFromInvestigation = useCallback(
    async (investigationId: string, imageId: string) => {
      setInvestigations((prev) => {
        const updated = prev.map((inv) =>
          inv.id === investigationId
            ? {
                ...inv,
                imageIds: inv.imageIds.filter((id) => id !== imageId),
                updatedAt: new Date().toISOString(),
              }
            : inv
        );
        void saveInvestigations(updated);
        return updated;
      });
    },
    [saveInvestigations]
  );

  // ---- Corrections ----

  const addCorrection = useCallback(
    async (correction: Omit<UserCorrection, "id" | "timestamp">) => {
      const entry: UserCorrection = {
        ...correction,
        id: makeId(),
        timestamp: new Date().toISOString(),
      };
      setCorrections((prev) => {
        const updated = [entry, ...prev];
        void saveCorrections(updated);
        return updated;
      });
      await addAuditEntry(
        "CORRECTION_ADDED",
        `User corrected "${correction.attribute}": "${correction.originalValue}" → "${correction.correctedValue}"`,
        correction.imageId
      );
    },
    [saveCorrections, addAuditEntry]
  );

  return (
    <ImageContext.Provider
      value={{
        images,
        auditLog,
        investigations,
        corrections,
        addImage,
        updateImage,
        removeImage,
        clearAll,
        addAuditEntry,
        createInvestigation,
        updateInvestigation,
        deleteInvestigation,
        addImageToInvestigation,
        removeImageFromInvestigation,
        addCorrection,
        isLoaded,
      }}
    >
      {children}
    </ImageContext.Provider>
  );
}

export function useImages() {
  const ctx = useContext(ImageContext);
  if (!ctx) throw new Error("useImages must be used within ImageProvider");
  return ctx;
}
