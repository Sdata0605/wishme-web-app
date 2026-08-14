import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface TDSTransaction {
  id: string;
  created_at: string;
  gross_amount: number;
  tds_percentage: number;
  tds_amount: number;
  amount: number;
  description: string;
  booking_id?: string;
}

interface TDSTransactionTableProps {
  transactions: TDSTransaction[];
}

export function TDSTransactionTable({ transactions }: TDSTransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No TDS transactions found</p>
      </div>
    );
  }

  return (
    <div className="mobile-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Gross Amount</TableHead>
            <TableHead className="text-right">TDS %</TableHead>
            <TableHead className="text-right">TDS Deducted</TableHead>
            <TableHead className="text-right">Net Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="text-sm">
                {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm">{transaction.description}</span>
                  {transaction.booking_id && (
                    <span className="text-xs text-muted-foreground">
                      Booking #{transaction.booking_id.slice(0, 8)}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                ₹{transaction.gross_amount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary">{transaction.tds_percentage}%</Badge>
              </TableCell>
              <TableCell className="text-right text-destructive">
                -₹{transaction.tds_amount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-medium">
                ₹{transaction.amount.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
