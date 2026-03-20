import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Compact mode renders an inline fallback instead of a full-page card */
  inline?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.inline) {
      return (
        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <AlertTriangle className="h-4 w-4 text-accent" />
            <span className="text-xs font-semibold">Something went wrong</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            This section failed to render.
          </p>
          <button
            onClick={this.handleReset}
            className="text-[11px] font-medium text-accent hover:underline"
          >
            Try again
          </button>
        </div>
      );
    }

    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <AlertTriangle className="h-6 w-6 text-accent" />
            </div>
            <CardTitle className="text-lg">Something went wrong</CardTitle>
            <CardDescription>
              Something went wrong in this section. You can try again or go back to the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={this.handleReset} className="w-full">
              Try again
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/dashboard">Go to dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}
