import { useState, useCallback } from 'react';
import { Message } from '../types';

interface NavigationIntentResult {
  isNavigation: boolean;
  location?: string;
  responseMessage?: Message;
}

export const useNavigationIntent = () => 
{
  const checkNavigationIntent = useCallback((text: string): NavigationIntentResult => 
{
    // Map Intent Handling - Open in-app navigation
    const mapMatch = text.match(/(?:tìm|chỉ|dẫn|đưa)\s+đường\s+(?:đến|tới|tại|đi)?\s*(.+)/i);
    
    if (mapMatch && mapMatch[1]) 
{
      const location = mapMatch[1].trim();
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Đang mở bản đồ chỉ đường đến "${location}"...`,
        timestamp: new Date()
      };

      return {
        isNavigation: true,
        location,
        responseMessage: botMsg
      };
    }

    return { isNavigation: false };
  }, []);

  return { checkNavigationIntent };
};
