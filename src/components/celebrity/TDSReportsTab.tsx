import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TDSSummaryCard } from "@/components/tds/TDSSummaryCard";
import { TDSTransactionTable } from "@/components/tds/TDSTransactionTable";
import { useTDSReports } from "@/hooks/useTDSReports";
import { Button } from "@/components/ui/button";
import { Download, IndianRupee, Receipt, TrendingDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TDSReportsTab() {
  const [financialYear, setFinancialYear] = useState<string>("2024-25");
  const { transactions, stats, loading } = useTDSReports();

  const handleDownloadPDF = () => {
    // TODO: Implement PDF generation
    console.log("Downloading TDS Report PDF...");
  };

  const currentYear = new Date().getFullYear();
  const financialYears = [
    `${currentYear - 2}-${(currentYear - 1).toString().slice(-2)}`,
    `${currentYear - 1}-${currentYear.toString().slice(-2)}`,
    `${currentYear}-${(currentYear + 1).toString().slice(-2)}`
  ];

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading TDS reports...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">TDS Reports</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View your Tax Deducted at Source (TDS) statements
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={financialYear} onValueChange={setFinancialYear}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select FY" />
            </SelectTrigger>
            <SelectContent>
              {financialYears.map((year) => (
                <SelectItem key={year} value={year}>
                  FY {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleDownloadPDF} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TDSSummaryCard
          title="Gross Earnings"
          value={`₹${stats.totalGrossAmount.toLocaleString()}`}
          icon={IndianRupee}
          description="Before TDS deduction"
        />
        <TDSSummaryCard
          title="TDS Deducted"
          value={`₹${stats.totalTDSDeducted.toLocaleString()}`}
          icon={TrendingDown}
          description={`From ${stats.transactionCount} transactions`}
        />
        <TDSSummaryCard
          title="Net Amount"
          value={`₹${stats.totalNetAmount.toLocaleString()}`}
          icon={Receipt}
          description="After TDS deduction"
        />
      </div>

      {/* Transactions Table */}
      <Card className="mobile-card">
        <CardHeader>
          <CardTitle>TDS Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <TDSTransactionTable transactions={transactions} />
        </CardContent>
      </Card>

      {/* Tax Filing Info */}
      <Card className="mobile-card bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Tax Filing Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• TDS is deducted as per Income Tax Act regulations</p>
          <p>• Use Form 26AS to verify TDS credits with the Income Tax Department</p>
          <p>• Download quarterly reports for ITR filing</p>
          <p>• PAN verification ensures lower TDS rate (10% vs 20%)</p>
        </CardContent>
      </Card>
    </div>
  );
}
