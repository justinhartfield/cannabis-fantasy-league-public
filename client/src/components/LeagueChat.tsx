import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, MessageCircle, Image as ImageIcon, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLeagueChat } from "@/hooks/useLeagueChat";
import { useAuth } from "@/_core/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LeagueChatProps {
  leagueId: number;
  className?: string;
  variant?: "default" | "dark";
}

const GIPHY_API_KEY = "FvyxKNv0IpWExi4RdV5gZB6YKLQNcdoq";

const TEMPLATES = [
  "Good luck this week! You'll need it.",
  "Ouch, that score...",
  "Championship bound! 🏆",
  "Is that your starter or your bench? 🤔",
  "Trade offer incoming...",
];

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"];

const isImageMessage = (value: string) => {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }
    const pathname = url.pathname.toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
};

export function LeagueChat({ leagueId, className, variant = "default" }: LeagueChatProps) {
  const isDark = variant === "dark";
  const { user } = useAuth();
  const { messages: liveMessages, setMessages: setLiveMessages } = useLeagueChat(leagueId);
  const [inputValue, setInputValue] = useState("");
  const [giphySearch, setGiphySearch] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [isGiphyLoading, setIsGiphyLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial Load
  const { data: initialMessages } = trpc.chat.getMessages.useQuery({ leagueId });
  
  const sendMessageMutation = trpc.chat.postMessage.useMutation();

  // Combine messages (deduplicate by ID)
  const allMessages = [...liveMessages];
  if (initialMessages) {
    initialMessages.forEach(msg => {
      if (!allMessages.find(m => m.id === msg.id)) {
        allMessages.push(msg);
      }
    });
  }
  // Sort by date (oldest to newest)
  allMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  useEffect(() => {
    // Scroll to bottom on new message
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages.length]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
    sendMessageMutation.mutate({ leagueId, message: text });
    setInputValue("");
  };

  const searchGiphy = async (query: string) => {
    if (!query) return;
    setIsGiphyLoading(true);
    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=10&rating=pg`);
      const data = await res.json();
      setGifs(data.data);
    } catch (e) {
      console.error("Giphy error", e);
    } finally {
      setIsGiphyLoading(false);
    }
  };

  return (
    <div className={cn(
      "flex flex-col max-h-[520px] overflow-hidden",
      isDark 
        ? "bg-transparent" 
        : "border rounded-lg bg-background shadow-sm",
      className
    )}>
      <div className={cn(
        "p-4 font-semibold flex items-center gap-2 shrink-0",
        isDark ? "border-b border-white/10" : "border-b"
      )}>
        <MessageCircle className={cn("w-5 h-5", isDark ? "text-[#cfff4d]" : "text-primary")} />
        <span className={isDark ? "text-white" : ""}>
          {isDark ? "💩 Smack Talk" : "League Chat"}
        </span>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-4 p-4 overflow-x-hidden">
          {allMessages.map((msg) => {
            const isMe = msg.userId === user?.id;
            const isImage = isImageMessage(msg.message);

            return (
              <div key={msg.id} className={cn("flex gap-2 overflow-hidden", isMe ? "flex-row-reverse" : "")}>
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarImage src={msg.userAvatarUrl || undefined} />
                  <AvatarFallback>{msg.userName[0]}</AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "flex flex-col min-w-0",
                    isMe ? "items-end" : "items-start"
                  )}
                  style={{ maxWidth: "calc(100% - 3rem)" }}
                >
                  <span className={cn("text-xs mb-1", isDark ? "text-white/50" : "text-muted-foreground")}>
                    {msg.userName}, {format(new Date(msg.createdAt), "h:mm a")}
                  </span>
                  {isImage ? (
                    <div className="rounded-lg overflow-hidden" style={{ maxWidth: "min(280px, 60vw)" }}>
                      <img
                        src={msg.message}
                        alt="Chat attachment"
                        className="w-full h-auto object-contain block"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "rounded-lg p-3",
                        isMe 
                          ? isDark ? "bg-[#cfff4d] text-black" : "bg-primary text-primary-foreground"
                          : isDark ? "bg-white/10 text-white" : "bg-muted"
                      )}
                    >
                      {msg.message}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className={cn(
        "p-4 space-y-2 shrink-0",
        isDark ? "border-t border-white/10" : "border-t"
      )}>
        <div className="flex gap-2">
            {/* GIPHY / Templates Popover */}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className={isDark ? "border-white/20 text-white hover:bg-white/10" : ""}>
                <Zap className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <Tabs defaultValue="templates" className="w-full">
                <TabsList className="w-full rounded-none border-b bg-transparent">
                  <TabsTrigger value="templates" className="flex-1">Templates</TabsTrigger>
                  <TabsTrigger value="giphy" className="flex-1">GIFs</TabsTrigger>
                </TabsList>
                
                <TabsContent value="templates" className="p-4">
                  <div className="grid gap-2">
                    {TEMPLATES.map((t, i) => (
                      <Button 
                        key={i} 
                        variant="ghost" 
                        className="justify-start h-auto whitespace-normal text-left"
                        onClick={() => {
                          setInputValue(t);
                          setPopoverOpen(false);
                        }}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="giphy" className="p-4">
                  <div className="flex gap-2 mb-4">
                    <Input 
                        placeholder="Search GIFs..." 
                        value={giphySearch}
                        onChange={(e) => setGiphySearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchGiphy(giphySearch)}
                    />
                    <Button size="icon" onClick={() => searchGiphy(giphySearch)}>
                        <ImageIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {isGiphyLoading ? (
                        <div className="col-span-2 text-center py-4">Loading...</div>
                    ) : (
                        gifs.map((gif) => (
                            <img 
                                key={gif.id}
                                src={gif.images.fixed_height_small.url}
                                alt={gif.title}
                                className="cursor-pointer rounded hover:opacity-80 transition-opacity"
                                onClick={() => handleSendMessage(gif.images.original.url)}
                            />
                        ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </PopoverContent>
          </Popover>

          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputValue)}
            placeholder="Talk smack..."
            className={cn("flex-1", isDark && "bg-white/5 border-white/20 text-white placeholder:text-white/40")}
          />
          <Button 
            onClick={() => handleSendMessage(inputValue)} 
            disabled={sendMessageMutation.isPending}
            className={isDark ? "bg-[#cfff4d] text-black hover:bg-[#cfff4d]/90" : ""}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}


