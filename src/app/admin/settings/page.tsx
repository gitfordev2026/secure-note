"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSettingsPage() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin">
          <Button variant="outline" size="sm">Back to dashboard</Button>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Admin Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Configure administrative preferences.</p>
          <div className="pt-4 border-t border-input">
            <p className="text-sm text-muted-foreground">Admin bootstrap is handled via environment variables on first deploy.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
