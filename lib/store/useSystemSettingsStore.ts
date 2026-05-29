import { create } from 'zustand'

export interface SystemSettings {
  maintenance_mode: boolean
  auto_verification: boolean
  double_xp_active: boolean
  registration_open: boolean
  slow_mode_active: boolean
  community_approval_required: boolean
}

interface SystemSettingsState {
  settings: SystemSettings
  isLoaded: boolean
  setSettings: (settings: Partial<SystemSettings>) => void
  setSetting: (key: keyof SystemSettings, value: boolean) => void
  setLoaded: (loaded: boolean) => void
}

const defaultSettings: SystemSettings = {
  maintenance_mode: false,
  auto_verification: false,
  double_xp_active: false,
  registration_open: true,
  slow_mode_active: false,
  community_approval_required: false,
}

export const useSystemSettingsStore = create<SystemSettingsState>((set) => ({
  settings: defaultSettings,
  isLoaded: false,

  setSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),

  setSetting: (key, value) =>
    set((state) => ({ settings: { ...state.settings, [key]: value } })),

  setLoaded: (isLoaded) => set({ isLoaded }),
}))
