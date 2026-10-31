// apps/web/src/components/ErrorBoundary.tsx
'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught client exception:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 bg-black text-[#ededed]">
          <div className="max-w-md w-full p-6 rounded-2xl bg-zinc-950 border border-zinc-800 text-center flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {this.props.fallbackTitle || 'Player Error Encountered'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {this.state.error?.message || 'An unexpected rendering error occurred.'}
              </p>
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Player</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
