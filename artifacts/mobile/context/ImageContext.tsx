import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { AuditEntry, StoredImage } from "@/types/image";

const IMAGES_KEY = "image_intelligence_images";
const AUDIT_KEY = "image_intelligence_audit";

interface ImageContextValue {
  images: StoredImage[];
  auditLog: AuditEntry[];
  addImage: (image: StoredImage) => Promise<void>;
  updateImage: (id: string, updates: Partial<StoredImage>) => Promise<void>;
  removeImage: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  addAuditEntry: (action: string, details: string, imageId?: string) => Promise<void>;
  isLoaded: boolean;
}

const ImageContext = createContext<ImageContextValue | null>(null);

export function ImageProvider({ children }: { children: React.ReactNode }) {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [imagesRaw, auditRaw] = await Promise.all([
          AsyncStorage.getItem(IMAGES_KEY),
          AsyncStorage.getItem(AUDIT_KEY),
        ]);
        if (imagesRaw) setImages(JSON.parse(imagesRaw) as StoredImage[]);
        if (auditRaw) setAuditLog(JSON.parse(auditRaw) as AuditEntry[]);
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
    const trimmed = updated.slice(-200);
    await AsyncStorage.setItem(AUDIT_KEY, JSON.stringify(trimmed));
  }, []);

  const addAuditEntry = useCallback(
    async (action: string, details: string, imageId?: string) => {
      const entry: AuditEntry = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
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
      await addAuditEntry("IMAGE_REMOVED", `Image ${id} removed by user`, id);
    },
    [saveImages, addAuditEntry]
  );

  const clearAll = useCallback(async () => {
    setImages([]);
    await AsyncStorage.removeItem(IMAGES_KEY);
    await addAuditEntry("ALL_CLEARED", "All images cleared by user");
  }, [addAuditEntry]);

  return (
    <ImageContext.Provider
      value={{
        images,
        auditLog,
        addImage,
        updateImage,
        removeImage,
        clearAll,
        addAuditEntry,
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
