"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listProductsV1ProductsGet,
  createProductV1ProductsPost,
  updateProductV1ProductsProductIdPatch,
  deleteProductV1ProductsProductIdDelete,
  addImageV1ProductsProductIdImagesPost,
  removeImageV1ProductsProductIdImagesMediaUuidDelete,
  addStoreLinkV1ProductsProductIdLinksPost,
  removeStoreLinkV1ProductsProductIdLinksLinkIdDelete,
} from "@/lib/api/template-service";
import type {
  ProductResponse,
  ProductCreate,
  ProductUpdate,
  ProductStoreLinkCreate,
} from "@/lib/api/generated/template-service";

export function useProducts() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await listProductsV1ProductsGet({ throwOnError: true });
      setProducts(data ?? []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const createProduct = useCallback(async (payload: ProductCreate): Promise<ProductResponse> => {
    const { data } = await createProductV1ProductsPost({ body: payload, throwOnError: true });
    await fetchProducts();
    return data!;
  }, [fetchProducts]);

  const updateProduct = useCallback(async (productId: string, payload: ProductUpdate): Promise<ProductResponse> => {
    const { data } = await updateProductV1ProductsProductIdPatch({
      path: { product_id: productId },
      body: payload,
      throwOnError: true,
    });
    await fetchProducts();
    return data!;
  }, [fetchProducts]);

  const deleteProduct = useCallback(async (productId: string): Promise<void> => {
    await deleteProductV1ProductsProductIdDelete({ path: { product_id: productId }, throwOnError: true });
    await fetchProducts();
  }, [fetchProducts]);

  const addImage = useCallback(async (productId: string, mediaUuid: string): Promise<void> => {
    await addImageV1ProductsProductIdImagesPost({
      path: { product_id: productId },
      body: { media_uuid: mediaUuid },
      throwOnError: true,
    });
    await fetchProducts();
  }, [fetchProducts]);

  const removeImage = useCallback(async (productId: string, mediaUuid: string): Promise<void> => {
    await removeImageV1ProductsProductIdImagesMediaUuidDelete({
      path: { product_id: productId, media_uuid: mediaUuid },
      throwOnError: true,
    });
    await fetchProducts();
  }, [fetchProducts]);

  const addStoreLink = useCallback(async (productId: string, payload: ProductStoreLinkCreate): Promise<void> => {
    await addStoreLinkV1ProductsProductIdLinksPost({
      path: { product_id: productId },
      body: payload,
      throwOnError: true,
    });
    await fetchProducts();
  }, [fetchProducts]);

  const removeStoreLink = useCallback(async (productId: string, linkId: string): Promise<void> => {
    await removeStoreLinkV1ProductsProductIdLinksLinkIdDelete({
      path: { product_id: productId, link_id: linkId },
      throwOnError: true,
    });
    await fetchProducts();
  }, [fetchProducts]);

  return {
    products, isLoading, refetch: fetchProducts,
    createProduct, updateProduct, deleteProduct,
    addImage, removeImage,
    addStoreLink, removeStoreLink,
  };
}
