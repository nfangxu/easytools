import { Component, type ErrorInfo, type ReactElement, type ReactNode } from 'react';

interface ToolErrorBoundaryProps {
  children: ReactNode;
  /** Display name used in the fallback message and the reset button label. */
  toolName: string;
  /** Notified when the user clicks "Reset tool". */
  onReset?: () => void;
}

interface ToolErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  /** Monotonically incremented on reset so the parent can swap keys to force a remount. */
  resetCount: number;
}

/**
 * React error boundary that wraps each tool panel. When a tool throws
 * during render (or in a child effect) we surface a Workbench-flavoured
 * fallback card instead of letting the white screen spread. The fallback
 * exposes a "Reset tool" button that bumps `resetCount` so the AppShell
 * can swap the `key` prop on the wrapped tree and force a clean remount.
 */
export class ToolErrorBoundary extends Component<ToolErrorBoundaryProps, ToolErrorBoundaryState> {
  state: ToolErrorBoundaryState = {
    hasError: false,
    error: null,
    resetCount: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<ToolErrorBoundaryState> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // We deliberately log here rather than rethrowing — the boundary is the
    // last line of defence and the console is the only diagnostic surface
    // available without an external crash reporter wired in.
    // eslint-disable-next-line no-console
    console.error(`[ToolErrorBoundary] ${this.props.toolName} crashed:`, error, info.componentStack);
  }

  handleReset = (): void => {
    this.props.onReset?.();
    this.setState((current) => ({
      hasError: false,
      error: null,
      resetCount: current.resetCount + 1,
    }));
  };

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="tool-error-fallback" role="alert">
        <div className="tool-error-bezel">
          <div className="tool-error-meta">
            <span className="tool-error-tag">FAULT</span>
            <span className="tool-error-rule" aria-hidden="true" />
            <span className="tool-error-name">{this.props.toolName}</span>
          </div>
          <h1 className="tool-error-headline">Tool stopped responding</h1>
          <p className="tool-error-help">
            The {this.props.toolName} panel hit an error. Reset to start over, or switch to a
            different tool from the sidebar.
          </p>
          <div className="tool-error-actions">
            <button type="button" className="active" onClick={this.handleReset}>
              Reset tool
            </button>
          </div>
          {this.state.error ? (
            <details className="tool-error-details">
              <summary>Error detail</summary>
              <pre>{this.state.error.message}</pre>
            </details>
          ) : null}
        </div>
      </div>
    );
  }
}
