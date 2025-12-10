import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: 'youtube-music-clone-web-app-gam1kjid',
  auth: {
    mode: 'headless'
  }
})
