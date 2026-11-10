"use client";

import * as React from "react";
import { getNotesStatsAction, createNoteAction } from "@/server/actions/notes";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Clock, Activity, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = React.useState<{ total: number; archived: number; pinned: number } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getNotesStatsAction().then((res: any) => {
      setStats(res);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back to NoteApp.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/notes/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Note
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Notes" value={stats?.total ?? "--"} icon={<FileText className="h-5 w-5" />} />
        <StatCard title="Pinned" value={stats?.pinned ?? "--"} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard title="Archived" value={stats?.archived ?? "--"} icon={<Activity className="h-5 w-5" />} />
      </div>

      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="pinned">Pinned</TabsTrigger>
        </TabsList>
        <TabsContent value="recent" className="w-full">
          <p className="text-muted-foreground">Your recently updated notes will appear here.</p>
        </TabsContent>
        <TabsContent value="pinned" className="w-full">
          <p className="text-muted-foreground">No pinned notes yet.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <CardDescription className="mt-2">Keep track of your notes</CardDescription>
      </CardContent>
    </Card>
  );
}
