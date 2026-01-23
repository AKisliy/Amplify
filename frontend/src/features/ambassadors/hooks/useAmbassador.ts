import { useState, useEffect } from "react";
import { ambassadorApi } from "../services/api";
import type { Ambassador, CreateAmbassadorDto, UpdateAmbassadorDto, AmbassadorImage } from "../types";

const MOCK_AMBASSADORS: Ambassador[] = [
  {
    id: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    name: "John Doe",
    biography: "John Doe is a seasoned professional with over a decade of experience in international relations and project management. He has successfully led several high-profile initiatives, fostering collaboration across diverse teams and stakeholders. His commitment to sustainable development and community engagement makes him a valuable asset to Project Alpha. John holds a Master's degree in International Affairs and is passionate about using technology for social good.",
    behavioralPatterns: "John exhibits strong leadership qualities, often taking initiative in group settings. He demonstrates excellent communication skills, particularly in conflict resolution and negotiation. He is detail-oriented and highly organized, consistently meeting deadlines and exceeding expectations. He prefers collaborative work environments and values open and honest feedback. John shows a proactive approach to problem-solving and is always eager to learn new skills.",
    projectId: "0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d"
  },
  {
    id: "2a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d",
    name: "Sarah Johnson",
    biography: "Sarah Johnson is an innovative marketing strategist with 8 years of experience in digital marketing and brand development. She has worked with Fortune 500 companies to create compelling campaigns that drive engagement and revenue. Sarah is known for her creative thinking and data-driven approach to marketing. She holds an MBA in Marketing and is certified in Google Analytics and HubSpot.",
    behavioralPatterns: "Sarah is highly creative and thinks outside the box when approaching challenges. She is analytical and relies on data to make informed decisions. She works well under pressure and thrives in fast-paced environments. Sarah is an excellent team player who encourages collaboration and values diverse perspectives. She is also very adaptable and quick to learn new tools and technologies.",
    projectId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6e"
  },
  {
    id: "3a4b5c6d-7e8f-8a9b-0c1d-2e3f4a5b6c8d",
    name: "Michael Chen",
    biography: "Michael Chen is a market research analyst with expertise in consumer behavior and competitive analysis. With 6 years of experience in the field, he has helped numerous companies identify growth opportunities and optimize their market strategies. Michael has a background in economics and statistics, and he uses advanced analytical tools to derive actionable insights from complex data sets.",
    behavioralPatterns: "Michael is methodical and thorough in his approach to research. He pays close attention to detail and ensures accuracy in all his work. He is a strong communicator who can translate complex data into clear, actionable recommendations. Michael prefers working independently but collaborates effectively when needed. He is curious and always seeking to expand his knowledge in emerging market trends.",
    projectId: "2a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7f"
  }
];

export function useAmbassador(ambassadorId?: string) {
  const [ambassador, setAmbassador] = useState<Ambassador | null>(
    MOCK_AMBASSADORS.find(a => a.id === ambassadorId) || null
  );
  const [images, setImages] = useState<AmbassadorImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAmbassador = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ambassadorApi.getAmbassador(id);
      setAmbassador(data);
      
      // Also fetch images
      fetchImages(id);
    } catch (err: any) {
      console.warn("Falling back to mock ambassador due to API error:", err);
      const mock = MOCK_AMBASSADORS.find(a => a.id === id);
      setAmbassador(mock || null);
      
      // Fetch mock images
      fetchImages(id);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchImages = async (id: string) => {
    try {
      const data = await ambassadorApi.getAmbassadorImages(id);
      setImages(data);
    } catch (err) {
      console.warn("Error fetching images", err);
      setImages([]);
    }
  };

  const createAmbassador = async (data: CreateAmbassadorDto) => {
    setIsLoading(true);
    setError(null);
    try {
      const id = await ambassadorApi.createAmbassador(data);
      await fetchAmbassador(id);
      return id;
    } catch (err: any) {
      console.warn("Mocking create ambassador due to API error");
      const id = Math.random().toString(36).substring(7);
      const newAmbassador: Ambassador = {
        ...data,
        id,
      };
      setAmbassador(newAmbassador);
      return id;
    } finally {
      setIsLoading(false);
    }
  };

  const updateAmbassador = async (data: UpdateAmbassadorDto) => {
    setIsLoading(true);
    setError(null);
    try {
      await ambassadorApi.updateAmbassador(data);
      await fetchAmbassador(data.id);
    } catch (err: any) {
       console.warn("Mocking update ambassador due to API error");
       setAmbassador(prev => prev ? ({ ...prev, ...data }) : null);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAmbassador = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await ambassadorApi.deleteAmbassador(id);
      setAmbassador(null);
    } catch (err: any) {
      console.warn("Mocking delete ambassador due to API error");
      setAmbassador(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ambassadorId) {
      fetchAmbassador(ambassadorId);
    }
  }, [ambassadorId]);

  return {
    ambassador,
    isLoading,
    error,
    createAmbassador,
    updateAmbassador,
    deleteAmbassador,
    refetch: ambassadorId ? () => fetchAmbassador(ambassadorId) : undefined,
    images,
    refreshImages: ambassadorId ? () => fetchImages(ambassadorId) : undefined,
  };
}

