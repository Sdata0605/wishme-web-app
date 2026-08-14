import { formatDistanceToNow } from "date-fns";
import { Conversation } from "@/hooks/useConversations";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  if (conversations.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {conversations.map((conversation) => {
        const celebrity = conversation.celebrity;
        const isSelected = selectedId === conversation.id;
        const hasUnread = conversation.unread_count_user > 0;
        const lastMessage = conversation.last_message;

        // Format preview
        let preview = 'Start a conversation';
        if (lastMessage?.message_text) {
          const raw = lastMessage.message_text;
          if (lastMessage.sender_type === 'user') {
            preview = `You: ${raw}`;
          } else {
            preview = raw;
          }
        }

        // Time label
        let timeLabel = '';
        try {
          timeLabel = formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: false });
          // shorten labels
          timeLabel = timeLabel
            .replace('about ', '')
            .replace(' minutes', 'm')
            .replace(' minute', 'm')
            .replace(' hours', 'h')
            .replace(' hour', 'h')
            .replace(' days', 'd')
            .replace(' day', 'd')
            .replace('less than a', '<1');
        } catch {
          timeLabel = '';
        }

        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 text-left relative"
            style={{
              background: isSelected ? 'hsl(var(--primary) / 0.12)' : 'transparent',
              borderLeft: isSelected ? '3px solid hsl(var(--primary))' : '3px solid transparent',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.background = 'hsl(var(--foreground) / 0.03)';
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.background = 'transparent';
            }}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10">
                {celebrity?.image_url ? (
                  <img src={celebrity.image_url} alt={celebrity.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm">
                    {celebrity?.name?.[0]}
                  </div>
                )}
              </div>
              <div
                className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full"
                style={{ background: 'hsl(var(--message-success))', border: '2px solid hsl(var(--message-sidebar))' }}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-sm truncate ${hasUnread ? 'font-bold text-white' : 'font-semibold text-white'}`}>
                  {celebrity?.name}
                </span>
                <span
                  className="text-[11px] shrink-0 ml-2"
                  style={{ color: hasUnread ? 'hsl(var(--secondary))' : 'hsl(var(--foreground) / 0.35)' }}
                >
                  {timeLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p
                  className="text-[13px] truncate pr-2"
                  style={{ color: hasUnread ? 'hsl(var(--foreground) / 0.7)' : 'hsl(var(--foreground) / 0.4)' }}
                >
                  {preview}
                </p>
                {hasUnread && (
                  <span
                    className="shrink-0 flex items-center justify-center text-[11px] font-bold text-white rounded-full"
                    style={{
                      background: 'hsl(var(--secondary))',
                      minWidth: 20,
                      height: 20,
                      padding: '0 6px',
                    }}
                  >
                    {conversation.unread_count_user}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
