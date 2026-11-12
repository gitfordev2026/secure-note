import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Account settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Manage your account preferences here.</p>
          <div className="flex items-center gap-2 text-sm">
            <button className="text-muted-foreground hover:text-foreground">Change password</button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
