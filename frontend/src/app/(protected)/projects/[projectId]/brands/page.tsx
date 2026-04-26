"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBrands } from "@/features/brands/hooks/useBrands";
import { mediaApi } from "@/features/media/api";
import type { BrandResponse } from "@/lib/api/generated/template-service";

// ---------------------------------------------------------------------------
// Brand form state
// ---------------------------------------------------------------------------

interface BrandFormState {
  name: string;
  description: string;
  logoFile: File | null;
  logoPreview: string | null;
  logoUuid: string | null;
}

const emptyForm = (): BrandFormState => ({
  name: "",
  description: "",
  logoFile: null,
  logoPreview: null,
  logoUuid: null,
});

function brandToForm(brand: BrandResponse): BrandFormState {
  return {
    name: brand.name,
    description: brand.description ?? "",
    logoFile: null,
    logoPreview: brand.logo_image_uuid
      ? mediaApi.getMediaUrl(brand.logo_image_uuid)
      : null,
    logoUuid: brand.logo_image_uuid ?? null,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BrandsPage() {
  const { brands, isLoading, createBrand, updateBrand, deleteBrand } = useBrands();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandResponse | null>(null);
  const [form, setForm] = useState<BrandFormState>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BrandResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // -- dialog helpers --------------------------------------------------------

  const openCreate = () => {
    setEditingBrand(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (brand: BrandResponse) => {
    setEditingBrand(brand);
    setForm(brandToForm(brand));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingBrand(null);
  };

  // -- logo pick -------------------------------------------------------------

  const handleLogoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({
      ...f,
      logoFile: file,
      logoPreview: URL.createObjectURL(file),
      logoUuid: null, // will be uploaded on save
    }));
    e.target.value = "";
  };

  // -- save ------------------------------------------------------------------

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      let logoUuid = form.logoUuid;

      // Upload new logo if a file was picked
      if (form.logoFile) {
        const result = await mediaApi.uploadFile(form.logoFile);
        logoUuid = result.mediaId;
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        logo_image_uuid: logoUuid ?? undefined,
      };

      if (editingBrand) {
        await updateBrand(editingBrand.id, payload);
      } else {
        await createBrand(payload as any);
      }
      closeDialog();
    } catch (err) {
      console.error("Failed to save brand:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // -- delete ----------------------------------------------------------------

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBrand(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete brand:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // --------------------------------------------------------------------------

  return (
    <div className="container mx-auto px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Brands</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your brand library. Brand identity is injected into generation prompts.
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Brand
          </Button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : brands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Tag className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No brands yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Create your first brand to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map((brand, i) => (
              <motion.div
                key={brand.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative group/card rounded-xl border border-border/50 bg-card p-5 flex gap-4 hover:border-border hover:shadow-sm transition-all"
              >
                {/* Logo */}
                <div className="shrink-0 w-12 h-12 rounded-lg bg-muted/60 overflow-hidden flex items-center justify-center">
                  {brand.logo_image_uuid ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaApi.getMediaUrl(brand.logo_image_uuid)}
                      alt={brand.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Tag className="w-5 h-5 text-muted-foreground/40" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{brand.name}</p>
                  {brand.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {brand.description}
                    </p>
                  )}
                </div>

                {/* Actions — appear on hover */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(brand)}
                    className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(brand)}
                    className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBrand ? "Edit Brand" : "New Brand"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Logo */}
            <div className="flex flex-col items-center gap-2">
              <input
                id="brand-logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoPick}
                disabled={isSaving}
              />
              <button
                type="button"
                onClick={() => document.getElementById("brand-logo-upload")?.click()}
                disabled={isSaving}
                className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 bg-white/[0.04] flex items-center justify-center hover:border-white/20 transition-colors group focus:outline-none"
              >
                {form.logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logoPreview} alt="Logo" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <Tag className="w-7 h-7 text-white/20 group-hover:text-white/40 transition-colors" />
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/60 backdrop-blur-[2px] transition-opacity">
                  <span className="text-[10px] text-white/70 font-medium">Upload logo</span>
                </div>
              </button>
              <Label className="text-xs text-muted-foreground">Logo (optional)</Label>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="brand-name">Name</Label>
              <Input
                id="brand-name"
                placeholder="e.g. Acme Corp"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                autoFocus
                disabled={isSaving}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="brand-description">Brand spirit</Label>
              <Textarea
                id="brand-description"
                placeholder="Describe the brand's tone, values, and identity — this will be injected into generation prompts."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                disabled={isSaving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || isSaving}>
              {isSaving ? "Saving…" : editingBrand ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete brand?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong> will be permanently deleted.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
