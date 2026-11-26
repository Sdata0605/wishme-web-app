import { useMemo, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { LifeBuoy, Search, Send, Loader2, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type TicketStatus = "open" | "replied" | "closed";
type TabFilter = "all" | TicketStatus;

interface SupportTicket {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  source: string | null;
  created_at: string;
  updated_at: string;
  last_replied_at: string | null;
}

interface SupportTicketReply {
  id: string;
  ticket_id: string;
  admin_id: string | null;
  body: string;
  email_sent: boolean;
  email_error: string | null;
  created_at: string;
}

const TICKETS_KEY = ["admin-support-tickets"];
const OPEN_COUNT_KEY = ["admin-support-open-count"];
const repliesKey = (ticketId: string) => ["admin-support-replies", ticketId];

// The support tables are not in the generated Supabase types yet, so the
// untyped client is used for them.
const db = supabase as any;

async function readFunctionError(error: any): Promise<string> {
  const fallback = error?.message || "Unknown error";
  const ctx = error?.context;
  if (!ctx || typeof ctx.json !== "function") return fallback;
  try {
    const body = await ctx.json();
    const msg = body?.error ?? body?.message;
    return typeof msg === "string" && msg ? msg : fallback;
  } catch {
    return fallback;
  }
}

export function TicketStatusPill({ status }: { status: string }) {
  if (status === "open") {
    return <Badge className="shrink-0 bg-amber-100 text-amber-800 hover:bg-amber-100">Open</Badge>;
  }
  if (status === "replied") {
    return <Badge className="shrink-0 bg-blue-100 text-blue-800 hover:bg-blue-100">Replied</Badge>;
  }
  if (status === "closed") {
    return <Badge variant="secondary" className="shrink-0">Closed</Badge>;
  }
  return <Badge variant="outline" className="shrink-0">{status}</Badge>;
}

export default function AdminTickets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("id");
  const [tab, setTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");

  const { data: tickets = [], isLoading, isError } = useQuery({
    queryKey: TICKETS_KEY,
    queryFn: async (): Promise<SupportTicket[]> => {
      const { data, error } = await db
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupportTicket[];
    },
  });

  const counts = useMemo(() => {
    const c = { all: tickets.length, open: 0, replied: 0, closed: 0 };
    for (const t of tickets) {
      if (t.status === "open") c.open++;
      else if (t.status === "replied") c.replied++;
      else if (t.status === "closed") c.closed++;
    }
    return c;
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter(
      (t) =>
        (tab === "all" || t.status === tab) &&
        (!q ||
          [t.subject, t.name, t.email].some((v) => (v ?? "").toLowerCase().includes(q))),
    );
  }, [tickets, tab, search]);

  const filtering = tab !== "all" || search.trim() !== "";
  const selectedTicket = tickets.find((t) => t.id === selectedId) ?? null;

  const selectTicket = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("id", id);
    setSearchParams(next);
  };

  const clearSelection = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("id");
    setSearchParams(next);
  };

  const clearFilters = () => {
    setTab("all");
    setSearch("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-3xl font-bold">Tickets</h1>
        <p className="text-sm text-muted-foreground">User support messages from the app</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* Left: ticket list */}
        <Card className={cn("flex-col", selectedId ? "hidden lg:flex" : "flex")}>
          <div className="space-y-3 border-b p-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="text-xs">All ({counts.all})</TabsTrigger>
                <TabsTrigger value="open" className="text-xs">Open ({counts.open})</TabsTrigger>
                <TabsTrigger value="replied" className="text-xs">Replied ({counts.replied})</TabsTrigger>
                <TabsTrigger value="closed" className="text-xs">Closed ({counts.closed})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subject, name or email"
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea style={{ height: "calc(100vh - 220px)" }}>
            {isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : isError ? (
              <p className="p-6 text-center text-sm text-destructive">Could not load tickets</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-8 text-center">
                <LifeBuoy className="h-10 w-10 text-muted-foreground" />
                {filtering ? (
                  <>
                    <p className="text-sm text-muted-foreground">No tickets match your filters</p>
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No tickets yet</p>
                )}
              </div>
            ) : (
              filtered.map((t) => {
                const selected = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTicket(t.id)}
                    className={cn(
                      "block w-full min-w-0 border-b border-l-2 p-3 text-left transition-colors hover:bg-muted/50",
                      selected ? "border-l-primary bg-muted" : "border-l-transparent",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate font-medium">{t.subject}</p>
                      <TicketStatusPill status={t.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {t.name} · {t.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                    </p>
                  </button>
                );
              })
            )}
          </ScrollArea>
        </Card>

        {/* Right: detail */}
        <Card className={cn("flex-col", selectedId ? "flex" : "hidden lg:flex")}>
          {selectedTicket ? (
            <TicketDetail
              key={selectedTicket.id}
              ticket={selectedTicket}
              onBack={clearSelection}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
              Select a ticket to read and reply
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

interface TicketDetailProps {
  ticket: SupportTicket;
  onBack: () => void;
}

function TicketDetail({ ticket, onBack }: TicketDetailProps) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const { data: replies = [], isLoading: repliesLoading } = useQuery({
    queryKey: repliesKey(ticket.id),
    queryFn: async (): Promise<SupportTicketReply[]> => {
      const { data, error } = await db
        .from("support_ticket_replies")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SupportTicketReply[];
    },
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: TICKETS_KEY });
    queryClient.invalidateQueries({ queryKey: OPEN_COUNT_KEY });
    queryClient.invalidateQueries({ queryKey: repliesKey(ticket.id) });
  };

  const changeStatus = async (next: TicketStatus) => {
    const { error } = await db.from("support_tickets").update({ status: next }).eq("id", ticket.id);
    if (error) {
      toast({ title: "Could not update status", description: error.message, variant: "destructive" });
      return;
    }
    refreshAll();
  };

  const sendReply = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setSendFailed(false);

    let failure: string | null = null;
    let reply: { id: string; body: string; created_at: string } | null = null;
    let emailSent = false;

    try {
      const { data, error } = await supabase.functions.invoke("support-ticket-reply", {
        body: { ticket_id: ticket.id, body: text },
      });
      if (error) {
        failure = await readFunctionError(error);
      } else if (!data?.ok) {
        failure = typeof data?.error === "string" ? data.error : "Unknown error";
      } else {
        reply = data.reply ?? null;
        emailSent = data.emailSent === true;
        if (!emailSent) failure = data.emailError || "Email could not be delivered";
      }
    } catch (e: any) {
      failure = e?.message || "Unknown error";
    }

    if (emailSent) {
      if (reply) {
        const newReply: SupportTicketReply = {
          id: reply.id,
          ticket_id: ticket.id,
          admin_id: "admin",
          body: reply.body,
          email_sent: true,
          email_error: null,
          created_at: reply.created_at,
        };
        queryClient.setQueryData<SupportTicketReply[]>(repliesKey(ticket.id), (old) => [
          ...(old ?? []),
          newReply,
        ]);
      }
      queryClient.setQueryData<SupportTicket[]>(TICKETS_KEY, (old) =>
        (old ?? []).map((t) => (t.id === ticket.id ? { ...t, status: "replied" } : t)),
      );
      setBody("");
      toast({ title: `Reply sent to ${ticket.email}` });
    } else {
      setSendFailed(true);
      toast({
        title: "Could not send reply",
        description: failure ?? "Unknown error",
        variant: "destructive",
      });
    }

    refreshAll();
    setSending(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendReply();
    }
  };

  return (
    <>
      {/* Header */}
      <div className="space-y-3 border-b p-4">
        <Button variant="ghost" size="sm" className="-ml-2 lg:hidden" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to tickets
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-lg font-semibold">{ticket.subject}</h2>
            <p className="text-sm">
              {ticket.name} ·{" "}
              {/* Opens Gmail in a new tab with the customer's address and the subject filled in; the admin only writes and sends. */}
              <a
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(ticket.email)}&su=${encodeURIComponent(`Re: ${ticket.subject}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {ticket.email}
              </a>
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(ticket.created_at), "dd MMM yyyy, HH:mm")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <TicketStatusPill status={ticket.status} />
            <Select value={ticket.status} onValueChange={(v) => changeStatus(v as TicketStatus)}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Conversation */}
      <ScrollArea style={{ height: "calc(100vh - 220px)" }}>
        <div className="space-y-4 p-4">
          <div className="max-w-[85%] space-y-1">
            <div className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">{ticket.message}</div>
            <p className="text-xs text-muted-foreground">
              {ticket.name} · {format(new Date(ticket.created_at), "dd MMM, HH:mm")}
            </p>
          </div>

          {repliesLoading && <p className="text-xs text-muted-foreground">Loading replies...</p>}

          {replies.map((r) => {
            const isAdmin = !!r.admin_id;
            return (
              <div
                key={r.id}
                className={cn("flex max-w-[85%] flex-col", isAdmin ? "ml-auto items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "whitespace-pre-wrap rounded-xl border p-3 text-sm",
                    isAdmin ? "border-primary/20 bg-primary/10" : "border-transparent bg-muted",
                  )}
                >
                  {r.body}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isAdmin ? "Support" : ticket.name} · {format(new Date(r.created_at), "dd MMM, HH:mm")}
                  {isAdmin && r.email_sent === false && (
                    <span className="text-destructive"> · email not sent</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Reply footer */}
      <div className="space-y-2 border-t p-4">
        <Textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={sending}
          placeholder={`Write a reply. It will be emailed to ${ticket.email}`}
        />
        {sendFailed && (
          <p className="text-xs text-destructive">Email failed. Your reply was not sent.</p>
        )}
        <div className="flex justify-end">
          <Button onClick={sendReply} disabled={sending || !body.trim()}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {sendFailed ? "Retry" : "Send reply"}
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
