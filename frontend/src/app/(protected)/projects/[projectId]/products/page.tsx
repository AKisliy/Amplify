"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus, Package, Tag, Pencil, Trash2, X,
  ExternalLink, ImageIcon, Link as LinkIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import { useProducts } from "@/features/products/hooks/useProducts";
import { useBrands } from "@/features/brands/hooks/useBrands";
import { mediaApi } from "@/features/media/api";
import type {
  ProductResponse, ProductStoreLinkCreate, BrandCreate, BrandUpdate,
} from "@/lib/api/generated/template-service";
import type { BrandResponse } from "@/lib/api/generated/template-service";
import {
  createBrandV1BrandsPost, updateBrandV1BrandsBrandIdPatch,
  deleteBrandV1BrandsBrandIdDelete,
} from "@/lib/api/template-service";

const BRAND_NONE = "__none__";

const PLATFORMS: { value: string; label: string }[] = [
  { value: "tiktok-shop", label: "TikTok Shop" },
  { value: "shopify",     label: "Shopify" },
  { value: "amazon",      label: "Amazon" },
];

const platformLabel = (v: string) => PLATFORMS.find(p => p.value === v)?.label ?? v;

// ---------------------------------------------------------------------------
// Brands management sheet (reused from before, slightly trimmed)
// ---------------------------------------------------------------------------

function BrandsSheet() {
  const { brands, isLoading, refetch } = useBrands();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BrandResponse | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BrandResponse | null>(null);

  const openCreate = () => { setEditing(null); setName(""); setDescription(""); setDialogOpen(true); };
  const openEdit = (b: BrandResponse) => { setEditing(b); setName(b.name); setDescription(b.description ?? ""); setDialogOpen(true); };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim() || null };
      if (editing) {
        await updateBrandV1BrandsBrandIdPatch({ path: { brand_id: editing.id }, body: payload as BrandUpdate, throwOnError: true });
      } else {
        await createBrandV1BrandsPost({ body: payload as BrandCreate, throwOnError: true });
      }
      setDialogOpen(false);
      refetch();
    } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteBrandV1BrandsBrandIdDelete({ path: { brand_id: deleteTarget.id }, throwOnError: true });
    setDeleteTarget(null);
    refetch();
  };

  return (
    <>
      <Sheet>
        <button
          onClick={() => {}}
          className="hidden"
          id="brands-sheet-trigger"
        />
        <SheetContent className="w-[400px] flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <SheetTitle>Brands</SheetTitle>
              <Button size="sm" variant="outline" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />New</Button>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />)
            ) : brands.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No brands yet</p>
            ) : brands.map((b) => (
              <div key={b.id} className="group flex items-center gap-3 rounded-lg border border-border/50 p-3 hover:border-border transition-colors">
                <Tag className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.name}</p>
                  {b.description && <p className="text-xs text-muted-foreground truncate">{b.description}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(b)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteTarget(b)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Edit Brand" : "New Brand"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Name</Label>
              <Input placeholder="e.g. Acme Corp" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSave(); }} autoFocus disabled={isSaving} />
            </div>
            <div className="space-y-1.5"><Label>Brand spirit</Label>
              <Textarea placeholder="Tone, values, identity…" value={description} onChange={e => setDescription(e.target.value)} rows={3} disabled={isSaving} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || isSaving}>{isSaving ? "Saving…" : editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete brand?</AlertDialogTitle>
            <AlertDialogDescription><strong>&ldquo;{deleteTarget?.name}&rdquo;</strong> will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Create product dialog
// ---------------------------------------------------------------------------

function ProductCreateDialog({
  open, onClose, onCreated, brands, createProduct,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (p: ProductResponse) => void;
  brands: BrandResponse[];
  createProduct: ReturnType<typeof useProducts>["createProduct"];
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brandId, setBrandId] = useState(BRAND_NONE);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setBrandId(BRAND_NONE);
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const created = await createProduct({
        name: name.trim(),
        description: description.trim() || null,
        brand_id: brandId === BRAND_NONE ? null : brandId,
      } as any);
      onCreated(created);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">New Product</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g. Wireless Headphones"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
              autoFocus
              disabled={isSaving}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="Product description — will be injected into generation prompts."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              disabled={isSaving}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Brand</Label>
            <Select value={brandId} onValueChange={setBrandId} disabled={isSaving}>
              <SelectTrigger>
                <SelectValue placeholder="No brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BRAND_NONE}>No brand</SelectItem>
                {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isSaving}>
            {isSaving ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Product editor sheet (edit-only)
// ---------------------------------------------------------------------------

type ProductMutations = Pick<
  ReturnType<typeof useProducts>,
  "updateProduct" | "addImage" | "removeImage" | "addStoreLink" | "removeStoreLink"
>;

function ProductSheet({
  product, open, onClose, brands,
  updateProduct, addImage, removeImage, addStoreLink, removeStoreLink,
}: {
  product: ProductResponse;
  open: boolean;
  onClose: () => void;
  brands: BrandResponse[];
} & ProductMutations) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brandId, setBrandId] = useState(BRAND_NONE);
  const [isSaving, setIsSaving] = useState(false);
  const [newPlatform, setNewPlatform] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(product.name ?? "");
    setDescription(product.description ?? "");
    setBrandId(product.brand_id ?? BRAND_NONE);
    setNewPlatform("");
    setNewUrl("");
  }, [open, product]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await updateProduct(product.id, {
        name: name.trim(),
        description: description.trim() || null,
        brand_id: brandId === BRAND_NONE ? null : brandId,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !product) return;
    setIsUploadingImage(true);
    try {
      const result = await mediaApi.uploadFile(file);
      await addImage(product.id, result.mediaId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleAddLink = async () => {
    if (!newPlatform || !newUrl.trim()) return;
    setIsAddingLink(true);
    try {
      await addStoreLink(product.id, { platform: newPlatform, url: newUrl.trim() });
      setNewPlatform("");
      setNewUrl("");
    } finally {
      setIsAddingLink(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-[480px] sm:w-[520px] flex flex-col gap-0 p-0 overflow-y-auto">
        <SheetHeader className="px-6 py-4 border-b border-border/50 shrink-0">
          <SheetTitle>{product.name}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Images — top */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Images</Label>
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} disabled={isUploadingImage} />
                <Button size="sm" variant="outline" asChild disabled={isUploadingImage}>
                  <span>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    {isUploadingImage ? "Uploading…" : "Add image"}
                  </span>
                </Button>
              </label>
            </div>

            {(product.images ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 rounded-lg border border-dashed border-border/50 text-center">
                <ImageIcon className="w-7 h-7 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No images yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {(product.images ?? []).map(img => (
                  <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaApi.getMediaUrl(img.media_uuid)} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(product.id, img.media_uuid)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Basic info */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. Wireless Headphones" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Product description — will be injected into generation prompts." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger>
                  <SelectValue placeholder="No brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BRAND_NONE}>No brand</SelectItem>
                  {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!name.trim() || isSaving} size="sm">
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>

          {/* Store links */}
          <>
            <Separator />
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Store links</Label>

                {(product.store_links ?? []).length > 0 && (
                  <div className="space-y-1.5">
                    {(product.store_links ?? []).map(link => (
                      <div key={link.id} className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2">
                        <Badge variant="secondary" className="text-xs shrink-0">{platformLabel(link.platform)}</Badge>
                        <a href={link.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground truncate flex-1 flex items-center gap-1"
                        >
                          <span className="truncate">{link.url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        <button onClick={() => removeStoreLink(product.id, link.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add link form */}
                <div className="flex gap-2">
                  <Select value={newPlatform} onValueChange={setNewPlatform}>
                    <SelectTrigger className="w-36 shrink-0">
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="https://…"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleAddLink(); }}
                    className="flex-1"
                  />
                  <Button size="icon" variant="outline" onClick={handleAddLink} disabled={!newPlatform || !newUrl.trim() || isAddingLink}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Product card
// ---------------------------------------------------------------------------

function ProductCard({
  product, brands, onEdit, onDelete,
}: {
  product: ProductResponse;
  brands: BrandResponse[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const brand = brands.find(b => b.id === product.brand_id);
  const images = product.images ?? [];
  const storeLinks = product.store_links ?? [];
  const firstImage = images[0];

  return (
    <div className="relative group/card rounded-xl border border-border/50 bg-card hover:border-border hover:shadow-sm transition-all overflow-hidden">
      {/* Thumbnail */}
      <div className="aspect-video bg-muted/40 flex items-center justify-center overflow-hidden">
        {firstImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaApi.getMediaUrl(firstImage.media_uuid)} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-8 h-8 text-muted-foreground/20" />
        )}
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm leading-tight">{product.name}</p>
          {brand && <Badge variant="secondary" className="text-xs shrink-0">{brand.name}</Badge>}
        </div>

        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
        )}

        <div className="flex items-center gap-3 pt-1">
          {images.length > 0 && (
            <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />{images.length}
            </span>
          )}
          {storeLinks.length > 0 && (
            <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
              <LinkIcon className="w-3 h-3" />{storeLinks.length}
            </span>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground transition-all">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProductsPage() {
  const {
    products, isLoading,
    createProduct, updateProduct, deleteProduct,
    addImage, removeImage, addStoreLink, removeStoreLink,
  } = useProducts();
  const { brands } = useBrands();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openCreate = () => setCreateDialogOpen(true);
  const openEdit = (p: ProductResponse) => { setEditingProduct(p); setSheetOpen(true); };
  const handleCreated = (p: ProductResponse) => {
    setCreateDialogOpen(false);
    setEditingProduct(p);
    setSheetOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Products</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Product library — used as generation parameters in templates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BrandsSheet />
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />New Product
            </Button>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-muted/40 animate-pulse aspect-[4/3]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No products yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1 max-w-xs">
              Create your first product to use it as a parameter in your templates.
            </p>
            <Button size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />New Product
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <ProductCard
                  product={product}
                  brands={brands}
                  onEdit={() => openEdit(product)}
                  onDelete={() => setDeleteTarget(product)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Create dialog */}
      <ProductCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={handleCreated}
        brands={brands}
        createProduct={createProduct}
      />

      {/* Edit sheet */}
      {editingProduct && (
        <ProductSheet
          product={editingProduct}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          brands={brands}
          updateProduct={updateProduct}
          addImage={addImage}
          removeImage={removeImage}
          addStoreLink={addStoreLink}
          removeStoreLink={removeStoreLink}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
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
    </div>
  );
}
