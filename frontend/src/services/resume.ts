import { api } from './api'
import type { Resume, ResumeAnalysis } from '@/types'

export const resumeService = {
  async upload(file: File): Promise<Resume> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<Resume>('/resumes/upload', form, {
      headers: { 'Content-Type': undefined },
    })
    return data
  },

  async list(): Promise<Resume[]> {
    const { data } = await api.get<Resume[]>('/resumes/')
    return data
  },

  async get(id: string): Promise<Resume> {
    const { data } = await api.get<Resume>(`/resumes/${id}`)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/resumes/${id}`)
  },

  async analyze(resumeId: string, jobDescription?: string): Promise<ResumeAnalysis> {
    const { data } = await api.post<ResumeAnalysis>(`/resumes/${resumeId}/analyze`, {
      job_description: jobDescription || null,
    })
    return data
  },

  async listAnalyses(resumeId: string): Promise<ResumeAnalysis[]> {
    const { data } = await api.get<ResumeAnalysis[]>(`/resumes/${resumeId}/analyses`)
    return data
  },
}
