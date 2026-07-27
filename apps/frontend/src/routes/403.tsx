import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/403")({
  component: Forbidden,
});

function Forbidden() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>403</CardTitle>
          <CardDescription>无权限访问此页面。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link to="/dashboard" />}>返回首页</Button>
        </CardContent>
      </Card>
    </div>
  );
}
