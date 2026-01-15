import { useState } from 'react';
import { authService } from '../services/authService';
import { UnitDetail } from '../components/document-browser/types';
import { API_BASE_URL } from '../config';

export const useUnitDetail = () =>
{
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [unitDetail, setUnitDetail] = useState<UnitDetail | null>(null);
  const [loadingUnit, setLoadingUnit] = useState(false);

  const fetchUnitDetail = async (unitUrl: string) =>
  {
    // Extract unit ID from URL like "/unit/39e808c6-..."
    const match = unitUrl.match(/\/unit\/([a-f0-9-]+)/i);
    if (!match)
    {
      console.warn("Invalid unit URL:", unitUrl);
      return;
    }
    
    const unitId = match[1];
    setLoadingUnit(true);
    setShowUnitModal(true);
    setUnitDetail(null);
    
    try
    {
      const token = await authService.getValidAccessToken();
      const headers: Record<string, string> = {};
      if (token)
      {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${API_BASE_URL}/query/units/${unitId}`, { headers });
      if (!res.ok)
      {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      setUnitDetail(data);
    }
    catch (err)
    {
      console.error("Failed to fetch unit:", err);
      setUnitDetail({
        document: { title: "Lỗi" },
        unit: { text: "Không thể tải nội dung điều luật. Vui lòng thử lại." }
      } as UnitDetail);
    }
    finally
    {
      setLoadingUnit(false);
    }
  };

  const closeUnitModal = () => setShowUnitModal(false);

  return {
    showUnitModal,
    unitDetail,
    loadingUnit,
    fetchUnitDetail,
    closeUnitModal
  };
};
