import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Database, Download, ExternalLink, FileJson, FileSpreadsheet, 
  Loader2, AlertTriangle, CheckCircle, XCircle, FolderDown 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ALL_TABLES = [
  "profiles", "celebrities", "bookings", "wallet_transactions",
  "celebrity_wallet_transactions", "referral_transactions",
  "plans", "celebrity_favorites", "celebrity_favorite_pricing",
  "music_generations", "greeting_card_generations",
  "image_promotions", "ugc_ads", "photo_wishes",
  "voice_call_wishes", "wish_celebrity_orders",
  "occasion_bookings", "occasions", "loved_ones",
  "celebrity_reviews", "conversations", "messages",
  "message_templates", "message_events", "message_logs",
  "platform_settings", "payout_requests",
  "newsletter_subscriptions", "tds_reports",
  "user_activity_logs", "celebrity_applications",
  "celebrity_categories", "celebrity_events",
  "celebrity_media", "addresses", "bank_details",
  "countries", "states", "areas"
];

const CATEGORIES: Record<string, { label: string; tables: string[] }> = {
  financial: {
    label: "Financial",
    tables: ["wallet_transactions", "celebrity_wallet_transactions", "referral_transactions", "payout_requests", "tds_reports"]
  },
  user_data: {
    label: "User Data",
    tables: ["profiles", "addresses", "bank_details", "loved_ones"]
  },
  bookings_cat: {
    label: "Bookings",
    tables: ["bookings", "wish_celebrity_orders", "ugc_ads", "image_promotions", "voice_call_wishes", "photo_wishes", "music_generations"]
  },
  celebrity: {
    label: "Celebrity",
    tables: ["celebrities", "celebrity_favorites", "celebrity_reviews", "celebrity_events", "celebrity_applications"]
  },
  config: {
    label: "Config",
    tables: ["platform_settings", "plans", "occasions", "celebrity_categories"]
  }
};

async function fetchAllRows(tableName: string) {
  const allRows: any[] = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(tableName as any)
      .select("*")
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    page++;
  }
  return allRows;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function arrayToCsv(data: any[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export default function AdminDatabaseBackup() {
  const { toast } = useToast();
  const [tableCounts, setTableCounts] = useState<Record<string, number | null>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportLog, setExportLog] = useState<string[]>([]);
  const [exportingTable, setExportingTable] = useState<string | null>(null);

  useEffect(() => {
    fetchTableCounts();
  }, []);

  const fetchTableCounts = async () => {
    setLoadingCounts(true);
    const counts: Record<string, number | null> = {};
    await Promise.all(
      ALL_TABLES.map(async (table) => {
        try {
          const { count, error } = await supabase
            .from(table as any)
            .select("*", { count: "exact", head: true });
          counts[table] = error ? null : (count ?? 0);
        } catch {
          counts[table] = null;
        }
      })
    );
    setTableCounts(counts);
    setLoadingCounts(false);
  };

  const exportAllTables = async () => {
    setExporting(true);
    setExportLog([]);
    setExportProgress(0);
    const result: Record<string, any[]> = {};
    const skipped: string[] = [];

    for (let i = 0; i < ALL_TABLES.length; i++) {
      const table = ALL_TABLES[i];
      setExportLog(prev => [...prev, `Fetching ${table}...`]);
      setExportProgress(Math.round(((i) / ALL_TABLES.length) * 100));
      try {
        const rows = await fetchAllRows(table);
        result[table] = rows;
        setExportLog(prev => [...prev, `  ✅ ${table}: ${rows.length} rows`]);
      } catch {
        skipped.push(table);
        setExportLog(prev => [...prev, `  ⚠️ Skipped: ${table} (access restricted)`]);
      }
    }

    setExportProgress(100);
    const date = new Date().toISOString().split("T")[0];
    downloadFile(JSON.stringify(result, null, 2), `wishme_backup_${date}.json`, "application/json");
    localStorage.setItem("last_db_export", new Date().toISOString());
    toast({ title: "Export Complete", description: `Exported ${ALL_TABLES.length - skipped.length} tables. ${skipped.length} skipped.` });
    setExporting(false);
  };

  const exportSingleTable = async (table: string, format: "json" | "csv") => {
    setExportingTable(table);
    try {
      const rows = await fetchAllRows(table);
      const date = new Date().toISOString().split("T")[0];
      if (format === "json") {
        downloadFile(JSON.stringify(rows, null, 2), `${table}_${date}.json`, "application/json");
      } else {
        downloadFile(arrayToCsv(rows), `${table}_${date}.csv`, "text/csv");
      }
      toast({ title: "Exported", description: `${table}: ${rows.length} rows` });
    } catch {
      toast({ title: "Error", description: `Could not export ${table}`, variant: "destructive" });
    }
    setExportingTable(null);
  };

  const exportCategory = async (catKey: string) => {
    const cat = CATEGORIES[catKey];
    setExporting(true);
    setExportLog([]);
    const result: Record<string, any[]> = {};
    for (const table of cat.tables) {
      setExportLog(prev => [...prev, `Fetching ${table}...`]);
      try {
        result[table] = await fetchAllRows(table);
        setExportLog(prev => [...prev, `  ✅ ${table}: ${result[table].length} rows`]);
      } catch {
        setExportLog(prev => [...prev, `  ⚠️ Skipped: ${table}`]);
      }
    }
    const date = new Date().toISOString().split("T")[0];
    downloadFile(JSON.stringify(result, null, 2), `wishme_${catKey}_${date}.json`, "application/json");
    toast({ title: "Category Exported", description: cat.label });
    setExporting(false);
  };

  const lastExport = localStorage.getItem("last_db_export");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Database Backup & Export</h2>
        <p className="text-muted-foreground">Export all platform data as JSON or CSV</p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
          <span>This exports data only — not schema or functions. For full database backups use Supabase Dashboard.</span>
          <Button variant="outline" size="sm" asChild>
            <a href="https://supabase.com/dashboard/project/eqikeuqwbphwongtfzhe/database/backups" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" /> Open Supabase Backups
            </a>
          </Button>
        </AlertDescription>
      </Alert>

      {lastExport && (
        <p className="text-xs text-muted-foreground">Last export: {new Date(lastExport).toLocaleString()}</p>
      )}

      {/* Full Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Full Export</CardTitle>
          <CardDescription>Export all {ALL_TABLES.length} tables as a single JSON file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={exportAllTables} disabled={exporting} size="lg">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Export All Tables as JSON
          </Button>
          {exporting && <Progress value={exportProgress} className="h-2" />}
          {exportLog.length > 0 && (
            <div className="max-h-48 overflow-y-auto bg-muted rounded p-3 text-xs font-mono space-y-0.5">
              {exportLog.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FolderDown className="h-5 w-5" /> Export by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <Card key={key} className="p-4">
                <h4 className="font-medium mb-1">{cat.label}</h4>
                <p className="text-xs text-muted-foreground mb-3">{cat.tables.length} tables</p>
                <Button size="sm" variant="outline" onClick={() => exportCategory(key)} disabled={exporting}>
                  <Download className="h-3 w-3 mr-1" /> Export Category
                </Button>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Individual Tables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileJson className="h-5 w-5" /> Individual Tables</CardTitle>
          <CardDescription>Export tables one at a time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ALL_TABLES.map(table => (
              <Card key={table} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm truncate">{table}</span>
                  <Badge variant="secondary">
                    {loadingCounts ? "..." : (tableCounts[table] !== null ? `${tableCounts[table]} rows` : "N/A")}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportSingleTable(table, "json")} disabled={exportingTable === table}>
                    {exportingTable === table ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileJson className="h-3 w-3 mr-1" />} JSON
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportSingleTable(table, "csv")} disabled={exportingTable === table}>
                    <FileSpreadsheet className="h-3 w-3 mr-1" /> CSV
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
