import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../utils/database';

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
  modifiedAt?: Date;
  createdAt: Date;
}

export interface UpdateSettingInput {
  value: any;
  modifiedBy: string;
}

export class SettingsService {
  private readonly prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient();
  }

  /**
   * Get a single setting by key
   */
  async getSetting(key: string): Promise<SystemSetting | null> {
    try {
      const setting = await this.prisma.system_settings.findUnique({
        where: { key },
      });

      return setting;
    } catch (error: any) {
      console.error(`Error getting setting ${key}:`, error);
      throw new Error(`Failed to retrieve setting: ${error.message}`);
    }
  }

  /**
   * Get all settings by category
   */
  async getSettingsByCategory(category: string): Promise<SystemSetting[]> {
    try {
      const settings = await this.prisma.system_settings.findMany({
        where: { category },
        orderBy: { key: 'asc' },
      });

      return settings;
    } catch (error: any) {
      console.error(`Error getting settings for category ${category}:`, error);
      throw new Error(`Failed to retrieve settings: ${error.message}`);
    }
  }

  /**
   * Get all public settings
   */
  async getPublicSettings(): Promise<SystemSetting[]> {
    try {
      const settings = await this.prisma.system_settings.findMany({
        where: { isPublic: true },
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
      });

      return settings;
    } catch (error: any) {
      console.error('Error getting public settings:', error);
      throw new Error(`Failed to retrieve public settings: ${error.message}`);
    }
  }

  /**
   * Update an existing setting
   */
  async updateSetting(key: string, input: UpdateSettingInput): Promise<SystemSetting> {
    try {
      // Check if setting exists and is editable
      const existing = await this.prisma.system_settings.findUnique({
        where: { key },
      });

      if (!existing) {
        throw new Error(`Setting with key '${key}' not found`);
      }

      if (!existing.isEditable) {
        throw new Error(`Setting '${key}' is not editable`);
      }

      // Validate against schema if provided
      if (existing.validationSchema) {
        this.validateValue(input.value, existing.validationSchema);
      }

      const updated = await this.prisma.system_settings.update({
        where: { key },
        data: {
          value: input.value,
          modifiedBy: input.modifiedBy || null,
          modifiedAt: new Date(),
        },
      });

      return updated;
    } catch (error: any) {
      console.error(`Error updating setting ${key}:`, error);
      throw new Error(`Failed to update setting: ${error.message}`);
    }
  }

  /**
   * Create or update a setting (upsert)
   */
  async upsertSetting(
    key: string,
    value: any,
    description: string,
    category: string,
    options?: {
      isPublic?: boolean;
      isEditable?: boolean;
      validationSchema?: any;
      modifiedBy?: string;
    }
  ): Promise<SystemSetting> {
    try {
      const setting = await this.prisma.system_settings.upsert({
        where: { key },
        create: {
          id: `setting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          key,
          value,
          description,
          category,
          isPublic: options?.isPublic ?? false,
          isEditable: options?.isEditable ?? true,
          validationSchema: options?.validationSchema,
          modifiedBy: options?.modifiedBy,
        },
        update: {
          value,
          description,
          category,
          isPublic: options?.isPublic,
          isEditable: options?.isEditable,
          validationSchema: options?.validationSchema,
          modifiedBy: options?.modifiedBy,
          modifiedAt: new Date(),
        },
      });

      return setting;
    } catch (error: any) {
      console.error(`Error upserting setting ${key}:`, error);
      throw new Error(`Failed to upsert setting: ${error.message}`);
    }
  }

  /**
   * Initialize default knowledge management settings
   */
  async initializeKnowledgeSettings(): Promise<void> {
    try {
      await this.upsertSetting(
        'km.document.uploadPath',
        '/data/uploads/documents',
        'Default path for document uploads (local filesystem or MinIO bucket name)',
        'knowledge_management',
        {
          isPublic: false,
          isEditable: true,
          validationSchema: {
            type: 'string',
            minLength: 1,
            pattern: '^[/a-zA-Z0-9_-]+$',
          },
        }
      );

      await this.upsertSetting(
        'km.document.maxFileSize',
        10485760, // 10MB in bytes
        'Maximum file size for document uploads in bytes',
        'knowledge_management',
        {
          isPublic: true,
          isEditable: true,
          validationSchema: {
            type: 'number',
            minimum: 1024,
            maximum: 104857600, // 100MB max
          },
        }
      );

      await this.upsertSetting(
        'km.document.allowedFileTypes',
        ['pdf', 'doc', 'docx', 'txt', 'md'],
        'Allowed file extensions for document uploads',
        'knowledge_management',
        {
          isPublic: true,
          isEditable: true,
          validationSchema: {
            type: 'array',
            items: { type: 'string' },
          },
        }
      );

      console.log('Knowledge management settings initialized successfully');
    } catch (error: any) {
      console.error('Error initializing knowledge settings:', error);
      throw error;
    }
  }

  /**
   * Validate value against JSON schema
   */
  private validateValue(value: any, schema: any): void {
    // Basic validation (could be extended with a proper JSON schema validator)
    if (schema.type === 'string') {
      if (typeof value !== 'string') {
        throw new Error('Value must be a string');
      }
      if (schema.minLength && value.length < schema.minLength) {
        throw new Error(`Value must be at least ${schema.minLength} characters`);
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        throw new Error('Value does not match required pattern');
      }
    }

    if (schema.type === 'number') {
      if (typeof value !== 'number') {
        throw new Error('Value must be a number');
      }
      if (schema.minimum !== undefined && value < schema.minimum) {
        throw new Error(`Value must be at least ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        throw new Error(`Value must be at most ${schema.maximum}`);
      }
    }

    if (schema.type === 'array') {
      if (!Array.isArray(value)) {
        throw new Error('Value must be an array');
      }
    }
  }
}
