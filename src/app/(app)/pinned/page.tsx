import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PinnedPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Pinned Notes</h1>
      <Card>
        <CardHeader>
          <CardTitle>No pinned notes</CardTitle>
          <CardContent>
            <p className="text-muted-foreground">Pin important notes to keep them at the top.</p>
          </CardContent>
        </CardHeader>
      </Card>
    </div>
  );
}
