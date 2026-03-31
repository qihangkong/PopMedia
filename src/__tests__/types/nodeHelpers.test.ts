import { describe, it, expect } from 'vitest'
import { getNodeContent, getNodeMediaUrl, type NodeData } from '../../types'

describe('Node Helper Functions', () => {
  describe('getNodeContent', () => {
    it('should return content for text node', () => {
      const data: NodeData = {
        label: 'Text Node',
        type: 'text',
        content: 'Hello World',
      }
      expect(getNodeContent(data)).toBe('Hello World')
    })

    it('should return empty string for text node with no content', () => {
      const data: NodeData = {
        label: 'Text Node',
        type: 'text',
      }
      expect(getNodeContent(data)).toBe('')
    })

    it('should return formatted string for image node', () => {
      const data: NodeData = {
        label: 'Image Node',
        type: 'image',
        imageUrl: 'test.jpg',
      }
      expect(getNodeContent(data)).toBe('[图片] test.jpg')
    })

    it('should return formatted string for image node with no URL', () => {
      const data: NodeData = {
        label: 'Image Node',
        type: 'image',
      }
      expect(getNodeContent(data)).toBe('[图片] 无URL')
    })

    it('should return formatted string for video node', () => {
      const data: NodeData = {
        label: 'Video Node',
        type: 'video',
        videoUrl: 'video.mp4',
      }
      expect(getNodeContent(data)).toBe('[视频] video.mp4')
    })

    it('should return formatted string for audio node', () => {
      const data: NodeData = {
        label: 'Audio Node',
        type: 'audio',
        audioUrl: 'audio.mp3',
      }
      expect(getNodeContent(data)).toBe('[音频] audio.mp3')
    })

    it('should return JSON stringified data for unknown node type', () => {
      const data: NodeData = {
        label: 'Block Node',
        type: 'block',
      }
      const result = getNodeContent(data)
      expect(result).toContain('block')
      expect(result).toContain('Block Node')
    })
  })

  describe('getNodeMediaUrl', () => {
    it('should return imageUrl for image node', () => {
      const data: NodeData = {
        label: 'Image Node',
        type: 'image',
        imageUrl: 'test.jpg',
      }
      expect(getNodeMediaUrl(data)).toBe('test.jpg')
    })

    it('should return videoUrl for video node', () => {
      const data: NodeData = {
        label: 'Video Node',
        type: 'video',
        videoUrl: 'video.mp4',
      }
      expect(getNodeMediaUrl(data)).toBe('video.mp4')
    })

    it('should return audioUrl for audio node', () => {
      const data: NodeData = {
        label: 'Audio Node',
        type: 'audio',
        audioUrl: 'audio.mp3',
      }
      expect(getNodeMediaUrl(data)).toBe('audio.mp3')
    })

    it('should return undefined when no media URL is set', () => {
      const data: NodeData = {
        label: 'Text Node',
        type: 'text',
        content: 'Hello',
      }
      expect(getNodeMediaUrl(data)).toBeUndefined()
    })

    it('should prefer imageUrl over other URLs', () => {
      const data: NodeData = {
        label: 'Multi Node',
        type: 'image',
        imageUrl: 'image.jpg',
        videoUrl: 'video.mp4',
        audioUrl: 'audio.mp3',
      }
      expect(getNodeMediaUrl(data)).toBe('image.jpg')
    })
  })
})
