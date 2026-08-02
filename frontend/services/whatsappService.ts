import axios from 'axios';

const WHATSAPP_API_URL = 'http://api.quantstock.pranab.xyz/api/send';

export interface WhatsAppConfig {
  phone: string;
  enabled: boolean;
}

export interface SendWhatsAppPayload {
  phone: string;
  msg: string;
}

export const whatsappService = {
  getWhatsAppConfig: (): WhatsAppConfig => {
    if (typeof window === 'undefined') return { phone: '', enabled: true };
    const phone = localStorage.getItem('whatsapp_phone') || '';
    const enabledStr = localStorage.getItem('whatsapp_alerts_enabled');
    const enabled = enabledStr !== null ? enabledStr === 'true' : true;
    return { phone, enabled };
  },

  saveWhatsAppConfig: (config: WhatsAppConfig): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('whatsapp_phone', config.phone.trim());
    localStorage.setItem('whatsapp_alerts_enabled', String(config.enabled));
  },

  sendWhatsAppMessage: async (payload: SendWhatsAppPayload): Promise<{ success: boolean; message: string; raw_response?: any; status?: number }> => {
    // Format phone: remove +, spaces, dashes
    const cleanPhone = payload.phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      throw new Error('Please specify a valid WhatsApp phone number in Settings.');
    }

    // 1. Try Next.js server proxy route first (prevents browser CORS blocks)
    try {
      const proxyRes = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: cleanPhone,
          msg: payload.msg,
        }),
      });

      const proxyData = await proxyRes.json().catch(() => ({}));
      return {
        success: proxyRes.ok,
        status: proxyRes.status,
        message: proxyData.message || proxyData.detail || (typeof proxyData.raw_response === 'string' ? proxyData.raw_response : JSON.stringify(proxyData.raw_response || proxyData)),
        raw_response: proxyData.raw_response || proxyData,
      };
    } catch (proxyError: any) {
      console.warn('[WhatsApp Proxy Failed, fallback to direct fetch]:', proxyError?.message);
    }

    // 2. Direct fallback to external endpoint
    try {
      const res = await fetch(WHATSAPP_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: cleanPhone,
          msg: payload.msg,
        }),
      });

      const textData = await res.text();
      let data: any = textData;
      try {
        data = JSON.parse(textData);
      } catch {
        // text format
      }

      return {
        success: res.ok,
        status: res.status,
        message: typeof data === 'string' ? data : (data.message || data.status || data.detail || textData),
        raw_response: data,
      };
    } catch (directErr: any) {
      throw new Error(directErr?.message || 'Failed to dispatch WhatsApp message.');
    }
  },

  sendLowStockWhatsAppAlert: async (
    lowStockItems: Array<{ product_name?: string; name?: string; current_stock: number; minimum_stock?: number }>
  ): Promise<{ success: boolean; message: string }> => {
    const config = whatsappService.getWhatsAppConfig();
    if (!config.enabled) {
      return { success: false, message: 'WhatsApp alerts are disabled in Settings.' };
    }
    if (!config.phone) {
      throw new Error('WhatsApp phone number is not configured. Please set it up in Settings.');
    }

    if (!lowStockItems || lowStockItems.length === 0) {
      return { success: false, message: 'No low stock items to alert.' };
    }

    const itemListText = lowStockItems
      .map((item, idx) => {
        const pName = item.product_name || item.name || `Item #${idx + 1}`;
        const minStock = item.minimum_stock !== undefined ? ` (Min: ${item.minimum_stock})` : '';
        return `• ${pName}: ${item.current_stock} units left${minStock}`;
      })
      .join('\n');

    const msg = `⚠️ *QuantStock Low Stock Alert*\n\nThe following items require immediate reordering:\n\n${itemListText}\n\nPlease take action to prevent stockout!`;

    return whatsappService.sendWhatsAppMessage({
      phone: config.phone,
      msg,
    });
  },
};
