import { describe, it, expect, vi, beforeEach } from 'vitest'
import { skillRegistry } from '../../services/SkillRegistry'

// Mock the tauriApi module
vi.mock('../../utils/tauriApi', () => ({
  getSkills: vi.fn(),
  getSkill: vi.fn(),
  loadSkillReference: vi.fn(),
}))

import { getSkills, getSkill, loadSkillReference } from '../../utils/tauriApi'

describe('SkillRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset internal state without calling API
    skillRegistry._reset()
  })

  describe('initialize', () => {
    it('should load skills metadata on init', async () => {
      const mockMetas = [
        { id: 'skill1', name: 'Skill 1', description: 'Description 1' },
        { id: 'skill2', name: 'Skill 2', description: 'Description 2' },
      ]
      vi.mocked(getSkills).mockResolvedValueOnce(mockMetas)

      await skillRegistry.initialize()

      expect(getSkills).toHaveBeenCalled()
      expect(skillRegistry.findById('skill1')).toEqual({
        id: 'skill1',
        name: 'Skill 1',
        description: 'Description 1',
      })
    })

    it('should not reload if already initialized', async () => {
      const mockMetas = [{ id: 'skill1', name: 'Skill 1', description: 'Description 1' }]
      vi.mocked(getSkills).mockResolvedValueOnce(mockMetas)

      await skillRegistry.initialize()
      await skillRegistry.initialize()

      expect(getSkills).toHaveBeenCalledTimes(1)
    })

    it('should handle initialization errors gracefully', async () => {
      vi.mocked(getSkills).mockRejectedValueOnce(new Error('API Error'))

      // Should not throw
      await expect(skillRegistry.initialize()).resolves.not.toThrow()
    })
  })

  describe('findById', () => {
    it('should return skill metadata by id', async () => {
      const mockMetas = [{ id: 'test-skill', name: 'Test Skill', description: 'Test Description' }]
      vi.mocked(getSkills).mockResolvedValueOnce(mockMetas)

      await skillRegistry.initialize()

      const skill = skillRegistry.findById('test-skill')
      expect(skill).toEqual({
        id: 'test-skill',
        name: 'Test Skill',
        description: 'Test Description',
      })
    })

    it('should return null for non-existent skill', async () => {
      const mockMetas = [{ id: 'skill1', name: 'Skill 1', description: 'Description 1' }]
      vi.mocked(getSkills).mockResolvedValueOnce(mockMetas)

      await skillRegistry.initialize()

      expect(skillRegistry.findById('non-existent')).toBeNull()
    })
  })

  describe('getAll', () => {
    it('should return all skills', async () => {
      const mockMetas = [
        { id: 'skill1', name: 'Skill 1', description: 'Description 1' },
        { id: 'skill2', name: 'Skill 2', description: 'Description 2' },
      ]
      vi.mocked(getSkills).mockResolvedValueOnce(mockMetas)

      await skillRegistry.initialize()

      const all = skillRegistry.getAll()
      expect(all).toHaveLength(2)
      expect(all[0].id).toBe('skill1')
      expect(all[1].id).toBe('skill2')
    })

    it('should return empty array when no skills', async () => {
      vi.mocked(getSkills).mockResolvedValueOnce([])

      await skillRegistry.initialize()

      expect(skillRegistry.getAll()).toEqual([])
    })
  })

  describe('getSkillBody', () => {
    it('should load and cache skill body', async () => {
      const mockMetas = [{ id: 'test-skill', name: 'Test', description: 'Test' }]
      vi.mocked(getSkills).mockResolvedValueOnce(mockMetas)
      vi.mocked(getSkill).mockResolvedValueOnce({
        id: 'test-skill',
        name: 'Test',
        description: 'Test',
        body: 'Skill body content',
        needsUpstream: false,
      })

      await skillRegistry.initialize()
      const body = await skillRegistry.getSkillBody('test-skill')

      expect(body).toBe('Skill body content')
      expect(getSkill).toHaveBeenCalledWith('test-skill')
    })

    it('should return cached body on subsequent calls', async () => {
      const mockMetas = [{ id: 'test-skill', name: 'Test', description: 'Test' }]
      vi.mocked(getSkills).mockResolvedValueOnce(mockMetas)
      vi.mocked(getSkill).mockResolvedValueOnce({
        id: 'test-skill',
        name: 'Test',
        description: 'Test',
        body: 'Skill body content',
        needsUpstream: false,
      })

      await skillRegistry.initialize()
      await skillRegistry.getSkillBody('test-skill')
      await skillRegistry.getSkillBody('test-skill')

      expect(getSkill).toHaveBeenCalledTimes(1)
    })

    it('should return empty string on error', async () => {
      const mockMetas = [{ id: 'test-skill', name: 'Test', description: 'Test' }]
      vi.mocked(getSkills).mockResolvedValueOnce(mockMetas)
      vi.mocked(getSkill).mockRejectedValueOnce(new Error('Load failed'))

      await skillRegistry.initialize()
      const body = await skillRegistry.getSkillBody('test-skill')

      expect(body).toBe('')
    })
  })

  describe('getSkillReferences', () => {
    it('should load and cache skill references', async () => {
      const mockMetas = [{ id: 'test-skill', name: 'Test', description: 'Test' }]
      vi.mocked(getSkills).mockResolvedValueOnce(mockMetas)
      vi.mocked(loadSkillReference).mockResolvedValueOnce([
        { name: 'ref1.txt', content: 'Reference content 1' },
        { name: 'ref2.txt', content: 'Reference content 2' },
      ])

      await skillRegistry.initialize()
      const refs = await skillRegistry.getSkillReferences('test-skill', 'references')

      expect(refs.get('ref1.txt')).toBe('Reference content 1')
      expect(refs.get('ref2.txt')).toBe('Reference content 2')
    })

    it('should return empty map on error', async () => {
      const mockMetas = [{ id: 'test-skill', name: 'Test', description: 'Test' }]
      vi.mocked(getSkills).mockResolvedValueOnce(mockMetas)
      vi.mocked(loadSkillReference).mockRejectedValueOnce(new Error('Load failed'))

      await skillRegistry.initialize()
      const refs = await skillRegistry.getSkillReferences('test-skill', 'references')

      expect(refs.size).toBe(0)
    })
  })

  describe('getSkillsContext', () => {
    it('should return formatted skills context', async () => {
      const mockMetas = [
        { id: 'skill1', name: 'Skill One', description: 'Description One' },
        { id: 'skill2', name: 'Skill Two', description: 'Description Two' },
      ]
      vi.mocked(getSkills).mockResolvedValueOnce(mockMetas)

      await skillRegistry.initialize()

      const context = skillRegistry.getSkillsContext()

      expect(context).toContain('Skill One')
      expect(context).toContain('Description One')
      expect(context).toContain('Skill Two')
      expect(context).toContain('Description Two')
      expect(context).toContain('以下是你可用的 skills')
    })

    it('should return no skills message when empty', async () => {
      vi.mocked(getSkills).mockResolvedValueOnce([])

      await skillRegistry.initialize()

      expect(skillRegistry.getSkillsContext()).toBe('无可用的 skills。')
    })
  })

  describe('getAllMeta', () => {
    it('should return skill metas', async () => {
      const mockMetas = [
        { id: 'skill1', name: 'Skill 1', description: 'Description 1' },
      ]
      vi.mocked(getSkills).mockResolvedValueOnce(mockMetas)

      await skillRegistry.initialize()

      const metas = skillRegistry.getAllMeta()

      expect(metas).toHaveLength(1)
      expect(metas[0]).toEqual({
        id: 'skill1',
        name: 'Skill 1',
        description: 'Description 1',
      })
    })
  })

  describe('reload', () => {
    it('should clear cache and reinitialize', async () => {
      const mockMetas1 = [{ id: 'skill-old', name: 'Old Skill', description: 'Old' }]
      const mockMetas2 = [{ id: 'skill-new', name: 'New Skill', description: 'New' }]

      vi.mocked(getSkills)
        .mockResolvedValueOnce(mockMetas1)
        .mockResolvedValueOnce(mockMetas2)

      await skillRegistry.initialize()
      expect(skillRegistry.findById('skill-old')).not.toBeNull()

      await skillRegistry.reload()
      expect(skillRegistry.findById('skill-old')).toBeNull()
      expect(skillRegistry.findById('skill-new')).not.toBeNull()
    })
  })

  describe('_reset', () => {
    it('should clear all internal state', async () => {
      const mockMetas = [{ id: 'skill1', name: 'Skill 1', description: 'Description 1' }]
      vi.mocked(getSkills).mockResolvedValueOnce(mockMetas)

      await skillRegistry.initialize()
      expect(skillRegistry.findById('skill1')).not.toBeNull()

      skillRegistry._reset()
      expect(skillRegistry.findById('skill1')).toBeNull()
      expect(skillRegistry.getAll()).toEqual([])
    })
  })
})
