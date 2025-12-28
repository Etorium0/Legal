import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> 
{
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State 
{
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) 
{
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() 
{
    if (this.state.hasError) 
{
      return (
        <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center justify-center overflow-auto">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Đã xảy ra lỗi!</h1>
          <div className="bg-gray-800 p-4 rounded-lg w-full max-w-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-2">{this.state.error?.name}: {this.state.error?.message}</h2>
            <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
          >
            Tải lại ứng dụng
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
