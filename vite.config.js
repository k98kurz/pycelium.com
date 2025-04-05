import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        about: 'about.html',
        projects: 'projects.html',
        goals: 'goals.html',
        community: 'community.html'
      }
    }
  }
})
