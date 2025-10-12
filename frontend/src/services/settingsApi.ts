import { API_BASE_URL } from './api';

export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
  isPublic: boolean;
  isEditable: boolean;
  validationSchema?: any;
  modifiedBy?: string;
  modifiedAt?: string;
  createdAt: string;
}

export interface UpdateSettingInput {
  value: any;
}

class SettingsApi {
  /**
   * Get a specific setting by key
   */
  async getSetting(key: string): Promise<SystemSetting> {
    const response = await fetch(`${API_BASE_URL}/settings/${key}`, {
      headers: {
        'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get setting: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to get setting');
    }
    return data.data;
  }

  /**
   * Get all settings for a specific category
   */
  async getSettingsByCategory(category: string): Promise<SystemSetting[]> {
    const response = await fetch(`${API_BASE_URL}/settings/category/${category}`, {
      headers: {
        'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get settings: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to get settings');
    }
    return data.data;
  }

  /**
   * Get all public settings
   */
  async getPublicSettings(): Promise<SystemSetting[]> {
    const response = await fetch(`${API_BASE_URL}/settings/public`, {
      headers: {
        'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get public settings: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to get public settings');
    }
    return data.data;
  }

  /**
   * Update a setting
   */
  async updateSetting(key: string, value: any): Promise<SystemSetting> {
    const response = await fetch(`${API_BASE_URL}/settings/${key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
      },
      body: JSON.stringify({ value }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update setting: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to update setting');
    }
    return data.data;
  }

  /**
   * Initialize knowledge management settings
   */
  async initializeKnowledgeSettings(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/settings/initialize-knowledge`, {
      method: 'POST',
      headers: {
        'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize knowledge settings: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to initialize knowledge settings');
    }
  }

  /**
   * Get document upload path setting
   */
  async getDocumentUploadPath(): Promise<string> {
    const setting = await this.getSetting('km.document.uploadPath');
    return setting.value;
  }

  /**
   * Update document upload path setting
   */
  async updateDocumentUploadPath(path: string): Promise<SystemSetting> {
    return this.updateSetting('km.document.uploadPath', path);
  }

  /**
   * Get max file size setting
   */
  async getMaxFileSize(): Promise<number> {
    const setting = await this.getSetting('km.document.maxFileSize');
    return setting.value;
  }

  /**
   * Get allowed file types setting
   */
  async getAllowedFileTypes(): Promise<string[]> {
    const setting = await this.getSetting('km.document.allowedFileTypes');
    return setting.value;
  }
}

export const settingsApi = new SettingsApi();
