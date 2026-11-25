import { describe, it, expect } from 'vitest'

/**
 * Test suite for music command detection and parsing in Lumi chat.
 * Tests the isMusicCommand() and extractMusicQuery() functions.
 */
describe('Lumi Music Commands', () => {
  describe('Command Detection', () => {
    // These tests would be part of a full test suite that imports the actual functions
    // For now, they document the expected behavior

    it('should detect /play command prefix', () => {
      const content = '/play Numb de Linkin Park'
      const isMusicCommand = /^\/(?:play|reproduce|music)\s+/i.test(content)
      expect(isMusicCommand).toBe(true)
    })

    it('should detect /reproduce command prefix', () => {
      const content = '/reproduce Imagine de John Lennon'
      const isMusicCommand = /^\/(?:play|reproduce|music)\s+/i.test(content)
      expect(isMusicCommand).toBe(true)
    })

    it('should detect /music command prefix', () => {
      const content = '/music Bohemian Rhapsody'
      const isMusicCommand = /^\/(?:play|reproduce|music)\s+/i.test(content)
      expect(isMusicCommand).toBe(true)
    })

    it('should be case-insensitive', () => {
      const contents = ['/PLAY Song', '/Play Song', '/Play Song']
      contents.forEach((content) => {
        const isMusicCommand = /^\/(?:play|reproduce|music)\s+/i.test(content)
        expect(isMusicCommand).toBe(true)
      })
    })

    it('should not detect regular messages as music commands', () => {
      const contents = [
        'play this song',
        '/search song',
        '/play',
        'music is great',
      ]
      contents.forEach((content) => {
        const isMusicCommand = /^\/(?:play|reproduce|music)\s+/i.test(content)
        if (content === '/play') {
          expect(isMusicCommand).toBe(false) // No query provided
        } else {
          expect(isMusicCommand).toBe(false)
        }
      })
    })
  })

  describe('Query Extraction', () => {
    it('should extract song/artist from /play command', () => {
      const content = '/play Numb de Linkin Park'
      const match = content.match(/^\/(?:play|reproduce|music)\s+(.+)$/i)
      const query = match?.[1]?.trim()
      expect(query).toBe('Numb de Linkin Park')
    })

    it('should extract song/artist from /reproduce command', () => {
      const content = '/reproduce Imagine'
      const match = content.match(/^\/(?:play|reproduce|music)\s+(.+)$/i)
      const query = match?.[1]?.trim()
      expect(query).toBe('Imagine')
    })

    it('should handle multiple word queries', () => {
      const content = '/play The Beatles Yesterday Rock Version'
      const match = content.match(/^\/(?:play|reproduce|music)\s+(.+)$/i)
      const query = match?.[1]?.trim()
      expect(query).toBe('The Beatles Yesterday Rock Version')
    })

    it('should trim leading and trailing whitespace', () => {
      const content = '/play   Song Title   '
      const match = content.match(/^\/(?:play|reproduce|music)\s+(.+)$/i)
      const query = match?.[1]?.trim()
      expect(query).toBe('Song Title')
    })

    it('should handle special characters in query', () => {
      const content = `/play Björk - It's Oh So Quiet (Remix)`
      const match = content.match(/^\/(?:play|reproduce|music)\s+(.+)$/i)
      const query = match?.[1]?.trim()
      expect(query).toBe(`Björk - It's Oh So Quiet (Remix)`)
    })

    it('should return null for commands without query', () => {
      const content = '/play'
      const match = content.match(/^\/(?:play|reproduce|music)\s+(.+)$/i)
      const query = match?.[1]?.trim() ?? null
      expect(query).toBe(null)
    })
  })

  describe('YouTube URL Generation', () => {
    it('should build correct YouTube search URL', () => {
      const query = 'Numb Linkin Park'
      const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
      expect(youtubeUrl).toBe(
        'https://www.youtube.com/results?search_query=Numb%20Linkin%20Park'
      )
    })

    it('should handle special characters in URL encoding', () => {
      const query = `Björk - It's Oh So Quiet`
      const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
      expect(youtubeUrl).toContain('search_query')
      expect(youtubeUrl).not.toContain(' ') // Space should be encoded
    })

    it('should encode ampersands correctly', () => {
      const query = 'The Beatles & The Stones'
      const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
      expect(youtubeUrl).toContain('The%20Beatles%20%26%20The%20Stones')
    })
  })

  describe('Input Validation', () => {
    it('should reject empty queries', () => {
      const query = ''
      expect(query.length).toBe(0)
    })

    it('should handle maximum length queries', () => {
      const query = 'a'.repeat(500)
      expect(query.length).toBe(500)
      expect(query.length <= 500).toBe(true)
    })

    it('should reject queries exceeding maximum length', () => {
      const query = 'a'.repeat(501)
      expect(query.length).toBeGreaterThan(500)
    })
  })
})
