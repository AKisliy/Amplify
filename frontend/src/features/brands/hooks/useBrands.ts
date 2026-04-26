"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listBrandsV1BrandsGet,
  createBrandV1BrandsPost,
  updateBrandV1BrandsBrandIdPatch,
  deleteBrandV1BrandsBrandIdDelete,
} from "@/lib/api/template-service";
import type { BrandResponse, BrandCreate, BrandUpdate } from "@/lib/api/generated/template-service";

export function useBrands() {
  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBrands = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await listBrandsV1BrandsGet({ throwOnError: true });
      setBrands(data ?? []);
    } catch (err) {
      console.error("Failed to fetch brands:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const createBrand = useCallback(async (payload: BrandCreate): Promise<BrandResponse> => {
    const { data } = await createBrandV1BrandsPost({ body: payload, throwOnError: true });
    await fetchBrands();
    return data!;
  }, [fetchBrands]);

  const updateBrand = useCallback(async (brandId: string, payload: BrandUpdate): Promise<BrandResponse> => {
    const { data } = await updateBrandV1BrandsBrandIdPatch({
      path: { brand_id: brandId },
      body: payload,
      throwOnError: true,
    });
    await fetchBrands();
    return data!;
  }, [fetchBrands]);

  const deleteBrand = useCallback(async (brandId: string): Promise<void> => {
    await deleteBrandV1BrandsBrandIdDelete({
      path: { brand_id: brandId },
      throwOnError: true,
    });
    await fetchBrands();
  }, [fetchBrands]);

  return { brands, isLoading, refetch: fetchBrands, createBrand, updateBrand, deleteBrand };
}
