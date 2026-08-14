import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TDSSummaryCard } from "@/components/tds/TDSSummaryCard";
import { Button } from "@/components/ui/button";
import { Download, IndianRupee, TrendingDown, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface CelebrityTDS {
  celebrity_id: string;
  celebrity_name: string;
  gross_amount: number;
  tds_amount: number;
  net_amount: number;
  transaction_count: number;
}

function getFYDateRange(fy: string): { start: string; end: string } {
  const startYear = parseInt(fy.split("-")[0]);
  return {
    start: `${startYear}-04-01T00:00:00.000Z`,
    end: `${startYear + 1}-03-31T23:59:59.999Z`,
  };
}

export default function AdminTDSReports() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed
  const defaultFY = currentMonth >= 3
    ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}`
    : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;

  const [financialYear, setFinancialYear] = useState(defaultFY);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalGross: 0, totalTDS: 0, totalNet: 0, celebrityCount: 0 });
  const [celebrityTDS, setCelebrityTDS] = useState<CelebrityTDS[]>([]);

  const financialYears = [
    `${currentYear - 2}-${(currentYear - 1).toString().slice(-2)}`,
    `${currentYear - 1}-${currentYear.toString().slice(-2)}`,
    `${currentYear}-${(currentYear + 1).toString().slice(-2)}`,
  ];

  useEffect(() => {
    fetchAdminTDSData();
  }, [financialYear]);

  const fetchAdminTDSData = async () => {
    try {
      setLoading(true);
      const { start, end } = getFYDateRange(financialYear);

      const { data: transactions, error } = await supabase
        .from("celebrity_wallet_transactions")
        .select("*, celebrity:celebrities(id, name)")
        .not("tds_amount", "is", null)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const totals = (transactions || []).reduce(
        (acc, txn) => ({
          totalGross: acc.totalGross + (txn.gross_amount || 0),
          totalTDS: acc.totalTDS + (txn.tds_amount || 0),
          totalNet: acc.totalNet + (txn.amount || 0),
        }),
        { totalGross: 0, totalTDS: 0, totalNet: 0 }
      );

      const celebrityMap = new Map<string, CelebrityTDS>();
      (transactions || []).forEach((txn) => {
        const celebId = txn.celebrity_id;
        if (!celebrityMap.has(celebId)) {
          celebrityMap.set(celebId, {
            celebrity_id: celebId,
            celebrity_name: txn.celebrity?.name || "Unknown",
            gross_amount: 0,
            tds_amount: 0,
            net_amount: 0,
            transaction_count: 0,
          });
        }
        const celeb = celebrityMap.get(celebId)!;
        celeb.gross_amount += txn.gross_amount || 0;
        celeb.tds_amount += txn.tds_amount || 0;
        celeb.net_amount += txn.amount || 0;
        celeb.transaction_count += 1;
      });

      setStats({ ...totals, celebrityCount: celebrityMap.size });
      setCelebrityTDS(Array.from(celebrityMap.values()));
    } catch (error) {
      console.error("Error fetching admin TDS data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">TDS Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform-wide Tax Deducted at Source reports
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={financialYear} onValueChange={setFinancialYear}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {financialYears.map((year) => (
                <SelectItem key={year} value={year}>FY {year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <TDSSummaryCard title="Total Gross" value={`₹${stats.totalGross.toLocaleString()}`} icon={IndianRupee} />
          <TDSSummaryCard title="Total TDS" value={`₹${stats.totalTDS.toLocaleString()}`} icon={TrendingDown} />
          <TDSSummaryCard title="Total Net" value={`₹${stats.totalNet.toLocaleString()}`} icon={IndianRupee} />
          <TDSSummaryCard title="Celebrities" value={stats.celebrityCount.toString()} icon={Users} />
        </div>
      )}

      {/* Celebrity-wise TDS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Celebrity-wise TDS Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : celebrityTDS.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No TDS data available for FY {financialYear}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Celebrity</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">Gross Amount</TableHead>
                      <TableHead className="text-right">TDS Deducted</TableHead>
                      <TableHead className="text-right">Net Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {celebrityTDS.map((celeb) => (
                      <TableRow key={celeb.celebrity_id}>
                        <TableCell className="font-medium">{celeb.celebrity_name}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{celeb.transaction_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right">₹{celeb.gross_amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-destructive">₹{celeb.tds_amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">₹{celeb.net_amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {celebrityTDS.map((celeb) => (
                  <Card key={celeb.celebrity_id} className="bg-muted/30">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{celeb.celebrity_name}</span>
                        <Badge variant="secondary">{celeb.transaction_count} txns</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Gross</p>
                          <p className="font-medium">₹{celeb.gross_amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">TDS</p>
                          <p className="font-medium text-destructive">₹{celeb.tds_amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Net</p>
                          <p className="font-medium">₹{celeb.net_amount.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
