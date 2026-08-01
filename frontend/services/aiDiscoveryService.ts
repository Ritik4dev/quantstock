import { apiClient } from './apiClient';
import { BusinessProfile } from '@/types/api';

export interface ExtractedProfile {
  business_type?: string;
  location_type?: string;
  nearby_places?: string[];
  primary_customers?: string[];
  daily_customers?: string;
  top_products?: string[];
  employees?: string;
  supplier_count?: string;
  seasonality?: string;
  business_scale?: string;
  notes?: string;
}

export interface ConfirmDiscoveryPayload {
  business_id: number;
  confirmed_profile: ExtractedProfile;
  confirmed: boolean;
}

export interface DiscoveryResponse {
  extracted_profile: ExtractedProfile;
  missing_fields: string[];
  followup_questions: string[];
  confirmation_summary?: string;
  is_complete: boolean;
}

export const aiDiscoveryService = {
  interview: async (userInput: string, existingProfile?: ExtractedProfile): Promise<DiscoveryResponse> => {
    const res = await apiClient.post<DiscoveryResponse>('/ai/interview', {
      user_input: userInput,
      existing_profile: existingProfile || null,
    });
    return res.data;
  },

  confirm: async (payload: ConfirmDiscoveryPayload): Promise<BusinessProfile> => {
    const res = await apiClient.post<BusinessProfile>('/ai/confirm', payload);
    return res.data;
  },
};
