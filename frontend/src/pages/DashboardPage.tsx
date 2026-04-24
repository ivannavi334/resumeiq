import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, BarChart2, FileText, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { resumeService } from '@/services/resume'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { UploadZone } from '@/components/resume/UploadZone'
import { AnalysisResult } from '@/components/resume/AnalysisResult'
import { formatDate, formatFileSize } from '@/utils/format'
import type { Resume, ResumeAnalysis } from '@/types'

export function DashboardPage() {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  const [showUpload, setShowUpload] = useState(false)
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [activeAnalysis, setActiveAnalysis] = useState<ResumeAnalysis | null>(null)

  const { data: resumes = [], isLoading } = useQuery({
    queryKey: ['resumes'],
    queryFn: resumeService.list,
  })

  const uploadMutation = useMutation({
    mutationFn: resumeService.upload,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['resumes'] }); setShowUpload(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: resumeService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resumes'] }),
  })

  const analyzeMutation = useMutation({
    mutationFn: ({ id, jd }: { id: string; jd: string }) => resumeService.analyze(id, jd || undefined),
    onSuccess: (analysis) => setActiveAnalysis(analysis),
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {profile && (
            <p className="mt-1 text-sm text-gray-500">
              {profile.analyses_count} analyses used this month
              {profile.plan === 'free' && ` · ${3 - profile.analyses_count} remaining`}
            </p>
          )}
        </div>
        <Button onClick={() => setShowUpload((v) => !v)} size="md">
          <Plus className="h-4 w-4" />
          Upload Resume
        </Button>
      </div>

      {/* Upload zone */}
      {showUpload && (
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-900">Upload New Resume</h2></CardHeader>
          <CardBody>
            <UploadZone onUpload={(file) => uploadMutation.mutate(file)} loading={uploadMutation.isPending} />
            {uploadMutation.isError && (
              <p className="mt-3 text-sm text-red-600">{String(uploadMutation.error)}</p>
            )}
          </CardBody>
        </Card>
      )}

      {/* Resumes list */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading…</div>
      ) : resumes.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 font-medium text-gray-900">No resumes yet</p>
            <p className="text-sm text-gray-500">Upload your first resume to get started</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {resumes.map((resume: Resume) => (
            <Card key={resume.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-indigo-500 shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">{resume.original_filename}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(resume.created_at)}
                        {resume.file_size && ` · ${formatFileSize(resume.file_size)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveResumeId(activeResumeId === resume.id ? null : resume.id)}
                    >
                      <BarChart2 className="h-4 w-4" />
                      Analyze
                      {activeResumeId === resume.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(resume.id)}
                      loading={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {activeResumeId === resume.id && (
                  <div className="mt-6 space-y-4 border-t border-gray-100 pt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Job Description <span className="text-gray-400">(optional — improves analysis)</span>
                      </label>
                      <textarea
                        rows={4}
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste the job description here…"
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <Button
                      onClick={() => analyzeMutation.mutate({ id: resume.id, jd: jobDescription })}
                      loading={analyzeMutation.isPending}
                    >
                      Run Analysis
                    </Button>
                    {activeAnalysis && activeAnalysis.resume_id === resume.id && (
                      <AnalysisResult analysis={activeAnalysis} />
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
