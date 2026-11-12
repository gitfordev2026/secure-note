import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ArchivedPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Archived Notes</h1>
      <Card>
        <CardHeader>
          <CardTitle>No archived notes</CardTitle>
          <CardContent>
            <p className="text-muted-foreground">Archived notes are hidden from your main list but kept safely.</p>
          </CardContent>
        </CardHeader>
      </Card>
    </div>
  );
}
