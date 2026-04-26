"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Package, Tag, Pencil, Trash2, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useBrands } from "@/features/brands/hooks/useBrands";
import { mediaApi } from "@/features/media/api";
import type { BrandResponse, BrandCreate, BrandUpdate } from "@/lib/api/generated/template-service";

// ---------------------------------------------------------------------------
// Brand management sheet (inline, no separate page)
// ---------------------------------------------------------------------------

interface BrandFormState {
  name: string;
  description: string;
  logoFile: File | null;
  logoPreview: string | null;
  logoUuid: string | null;
}

const emptyBrandForm = (): BrandFormState => ({
  name: "",
  description: "",
  logoFile: null,
  logoPreview: null,
  logoUuid: null,
});

function BrandsSheet() {
  const { brands, isLoading, createBrand, updateBrand, deleteBrand } = useBrands();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandResponse | null>(null);
  const [form, setForm] = useState<BrandFormState>(emptyBrandForm());
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BrandResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openCreate = () => {
    setEditingBrand(null);
    setForm(emptyBrandForm());
    setDialogOpen(true);
  };

  const openEdit = (brand: BrandResponse) => {
    setEditingBrand(brand);
    setForm({
      name: brand.name,
      description: brand.description ?? "",
      logoFile: null,
      logoPreview: brand.logo_image_uuid ? mediaApi.getMediaUrl(brand.logo_image_uuid) : null,
      logoUuid: brand.logo_image_uuid ?? null,
    });
    setDialogOpen(true);
  };

  const handleLogoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, logoFile: file, logoPreview: URL.createObjectURL(file), logoUuid: null }));
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      let logoUuid = form.logoUuid;
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
        await updateBrand(editingBrand.id, payload as BrandUpdate);
      } else {
        await createBrand(payload as BrandCreate);
      }
      setDialogOpen(false);
    } catch (err) {
      console.error("Failed to save brand:", err);
    } finally {
      setIsSaving(false);
    }
  };

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

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <Tag className="w-4 h-4 mr-2" />
            Manage Brands
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <SheetTitle>Brands</SheetTitle>
              <Button size="sm" variant="outline" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1.5" />
                New
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
              ))
            ) : brands.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Tag className="w-8 h-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No brands yet</p>
              </div>
            ) : (
              brands.map((brand) => (
                <div
                  key={brand.id}
                  className="group flex items-center gap-3 rounded-lg border border-border/50 p-3 hover:border-border transition-colors"
                >
                  <div className="shrink-0 w-9 h-9 rounded-md bg-muted/60 overflow-hidden flex items-center justify-center">
                    {brand.logo_image_uuid ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaApi.getMediaUrl(brand.logo_image_uuid)}
                        alt={brand.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Tag className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{brand.name}</p>
                    {brand.description && (
                      <p className="text-xs text-muted-foreground truncate">{brand.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => openEdit(brand)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(brand)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Brand create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingBrand ? "Edit Brand" : "New Brand"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-2">
              <input id="brand-logo" type="file" accept="image/*" className="hidden" onChange={handleLogoPick} disabled={isSaving} />
              <button
                type="button"
                onClick={() => document.getElementById("brand-logo")?.click()}
                disabled={isSaving}
                className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 bg-white/[0.04] flex items-center justify-center hover:border-white/20 transition-colors group focus:outline-none"
              >
                {form.logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logoPreview} alt="Logo" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <Tag className="w-6 h-6 text-white/20 group-hover:text-white/40 transition-colors" />
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/60 transition-opacity">
                  <span className="text-[9px] text-white/70 font-medium">Upload</span>
                </div>
              </button>
              <Label className="text-xs text-muted-foreground">Logo (optional)</Label>
            </div>
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
            <div className="space-y-1.5">
              <Label htmlFor="brand-desc">Brand spirit</Label>
              <Textarea
                id="brand-desc"
                placeholder="Tone, values, identity — injected into generation prompts."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                disabled={isSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || isSaving}>
              {isSaving ? "Saving…" : editingBrand ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Brand delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete brand?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong> will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Products page
// ---------------------------------------------------------------------------

export default function ProductsPage() {
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
            <h1 className="text-2xl font-semibold">Products</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your product library. Products are used as generation parameters in templates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BrandsSheet />
            <Button size="sm" disabled>
              <Plus className="w-4 h-4 mr-2" />
              New Product
            </Button>
          </div>
        </div>

        {/* Empty state — products not yet implemented */}
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Package className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">No products yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1 max-w-sm">
            Product management is coming soon. You can already set up your brands using the button above.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
