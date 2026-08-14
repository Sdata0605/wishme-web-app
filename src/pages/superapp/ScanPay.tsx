import { useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Image as ImageIcon, QrCode, Wallet } from "lucide-react";
import { SuperAppShell } from "@/components/superapp/SuperAppShell";
import { PageTitle, Panel } from "@/components/superapp/ServiceIcon";

export default function ScanPay() {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  function pay() {
    if (!amount || Number(amount) <= 0) {
      setStatus("Enter a valid amount.");
      return;
    }
    setStatus(`Payment of ₹${Number(amount).toFixed(2)} ready to confirm.`);
  }

  return (
    <SuperAppShell nav="scan">
      <PageTitle title="Scan & Pay" subtitle="Pay any UPI QR from camera or gallery" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
            <div className="relative">
              <QrCode className="h-24 w-24 text-slate-700" strokeWidth={1.4} />
              <span className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-[#ff5c00]" />
            </div>
          </div>
          <h2 className="mt-4 text-center text-base font-semibold text-slate-900">Point at a merchant QR</h2>
          <p className="mt-1 text-center text-sm text-slate-500">
            Confirm the name, enter amount if needed, then pay with UPI or wallet.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStatus("Camera will open once payments are connected.")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#ff5c00] text-sm font-semibold text-white hover:bg-[#ea580c]"
            >
              <Camera className="h-4 w-4" /> Camera
            </button>
            <button
              type="button"
              onClick={() => setStatus("Choose a QR image from your gallery.")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <ImageIcon className="h-4 w-4" /> Gallery
            </button>
          </div>
          <Link
            to="/wallet"
            className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Wallet className="h-4 w-4" /> Pay from wallet instead
          </Link>
        </Panel>

        <Panel>
          <h3 className="font-semibold text-slate-900">Enter amount</h3>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Amount (₹)</span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#ff5c00]"
            />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Note (optional)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 40))}
              placeholder="Lunch, rent…"
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#ff5c00]"
            />
          </label>
          <button
            type="button"
            onClick={pay}
            className="mt-4 h-11 w-full rounded-lg bg-[#ff5c00] text-sm font-semibold text-white hover:bg-[#ea580c]"
          >
            Continue
          </button>
          {status ? <p className="mt-2 text-sm text-slate-600">{status}</p> : null}

          <ol className="mt-5 space-y-1.5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            <li>1. Scan or upload a QR</li>
            <li>2. Check merchant name and amount</li>
            <li>3. Pay with UPI or WishMe wallet</li>
          </ol>
        </Panel>
      </div>
    </SuperAppShell>
  );
}
