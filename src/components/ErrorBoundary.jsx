import { Component } from 'react'

/**
 * Catches render/runtime errors anywhere below it and shows a terminal-style
 * crash report instead of a blank white screen. Without this, any thrown error
 * during render (e.g. a bad import in a lazy chunk) unmounts the whole tree and
 * leaves the user staring at nothing.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surface it in the console for debugging, too.
    console.error('[AuditorQuery] crash:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-zinc-950 p-6">
          <div className="max-w-lg border border-crimson-dim bg-crimson-dim/10 p-5 font-mono text-sm">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.3em] text-crimson">
              runtime fault // terminal halted
            </div>
            <pre className="whitespace-pre-wrap break-words text-xs text-zinc-300">
              {String(this.state.error?.stack || this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-crimson px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-950 hover:bg-crimson/80"
            >
              reboot terminal
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
