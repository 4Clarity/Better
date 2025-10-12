import { SettingsService } from '../settings.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
const mockPrismaClient = {
  system_settings: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
} as unknown as PrismaClient;

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    service = new SettingsService(mockPrismaClient);
    jest.clearAllMocks();
  });

  describe('getSetting', () => {
    it('should retrieve a setting by key', async () => {
      const mockSetting = {
        id: 'test-id',
        key: 'km.document.uploadPath',
        value: '/data/uploads/documents',
        description: 'Test setting',
        category: 'knowledge_management',
        isPublic: false,
        isEditable: true,
        createdAt: new Date(),
      };

      (mockPrismaClient.system_settings.findUnique as jest.Mock).mockResolvedValue(mockSetting);

      const result = await service.getSetting('km.document.uploadPath');

      expect(result).toEqual(mockSetting);
      expect(mockPrismaClient.system_settings.findUnique).toHaveBeenCalledWith({
        where: { key: 'km.document.uploadPath' },
      });
    });

    it('should return null if setting does not exist', async () => {
      (mockPrismaClient.system_settings.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getSetting('non.existent.key');

      expect(result).toBeNull();
    });
  });

  describe('updateSetting', () => {
    it('should update an editable setting', async () => {
      const existingSetting = {
        id: 'test-id',
        key: 'km.document.uploadPath',
        value: '/old/path',
        description: 'Test setting',
        category: 'knowledge_management',
        isPublic: false,
        isEditable: true,
        createdAt: new Date(),
      };

      const updatedSetting = {
        ...existingSetting,
        value: '/new/path',
        modifiedBy: 'user-123',
        modifiedAt: new Date(),
      };

      (mockPrismaClient.system_settings.findUnique as jest.Mock).mockResolvedValue(existingSetting);
      (mockPrismaClient.system_settings.update as jest.Mock).mockResolvedValue(updatedSetting);

      const result = await service.updateSetting('km.document.uploadPath', {
        value: '/new/path',
        modifiedBy: 'user-123',
      });

      expect(result.value).toBe('/new/path');
      expect(mockPrismaClient.system_settings.update).toHaveBeenCalled();
    });

    it('should throw error if setting is not editable', async () => {
      const nonEditableSetting = {
        id: 'test-id',
        key: 'system.readonly',
        value: 'readonly-value',
        description: 'Test setting',
        category: 'system',
        isPublic: false,
        isEditable: false,
        createdAt: new Date(),
      };

      (mockPrismaClient.system_settings.findUnique as jest.Mock).mockResolvedValue(nonEditableSetting);

      await expect(
        service.updateSetting('system.readonly', {
          value: 'new-value',
          modifiedBy: 'user-123',
        })
      ).rejects.toThrow("Setting 'system.readonly' is not editable");
    });

    it('should throw error if setting does not exist', async () => {
      (mockPrismaClient.system_settings.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateSetting('non.existent.key', {
          value: 'new-value',
          modifiedBy: 'user-123',
        })
      ).rejects.toThrow("Setting with key 'non.existent.key' not found");
    });
  });

  describe('getSettingsByCategory', () => {
    it('should retrieve all settings for a category', async () => {
      const mockSettings = [
        {
          id: 'test-id-1',
          key: 'km.document.uploadPath',
          value: '/data/uploads/documents',
          description: 'Upload path',
          category: 'knowledge_management',
          isPublic: false,
          isEditable: true,
          createdAt: new Date(),
        },
        {
          id: 'test-id-2',
          key: 'km.document.maxFileSize',
          value: 10485760,
          description: 'Max file size',
          category: 'knowledge_management',
          isPublic: true,
          isEditable: true,
          createdAt: new Date(),
        },
      ];

      (mockPrismaClient.system_settings.findMany as jest.Mock).mockResolvedValue(mockSettings);

      const result = await service.getSettingsByCategory('knowledge_management');

      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('knowledge_management');
      expect(mockPrismaClient.system_settings.findMany).toHaveBeenCalledWith({
        where: { category: 'knowledge_management' },
        orderBy: { key: 'asc' },
      });
    });
  });

  describe('validation', () => {
    it('should validate string values correctly', async () => {
      const existingSetting = {
        id: 'test-id',
        key: 'km.document.uploadPath',
        value: '/old/path',
        description: 'Test setting',
        category: 'knowledge_management',
        isPublic: false,
        isEditable: true,
        validationSchema: {
          type: 'string',
          minLength: 1,
          pattern: '^[/a-zA-Z0-9_-]+$',
        },
        createdAt: new Date(),
      };

      (mockPrismaClient.system_settings.findUnique as jest.Mock).mockResolvedValue(existingSetting);

      // Valid path
      (mockPrismaClient.system_settings.update as jest.Mock).mockResolvedValue({
        ...existingSetting,
        value: '/valid/path',
      });

      await expect(
        service.updateSetting('km.document.uploadPath', {
          value: '/valid/path',
          modifiedBy: 'user-123',
        })
      ).resolves.toBeDefined();

      // Invalid path (contains invalid characters)
      await expect(
        service.updateSetting('km.document.uploadPath', {
          value: '/invalid path with spaces',
          modifiedBy: 'user-123',
        })
      ).rejects.toThrow('Value does not match required pattern');
    });
  });
});
