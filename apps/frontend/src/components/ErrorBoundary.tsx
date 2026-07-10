import type { ReactNode } from "react";
import { Component } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// 全局错误边界:捕获非路由错误(事件处理、全局异常),避免白屏。
// React 19 仍需 class component(hook 无 ErrorBoundary);路由错误由 __root errorComponent 处理。
interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-svh items-center justify-center p-6">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>出错了</CardTitle>
              <CardDescription>页面发生未捕获错误</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">{this.state.error.message}</p>
              <Button onClick={() => window.location.reload()}>刷新页面</Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
