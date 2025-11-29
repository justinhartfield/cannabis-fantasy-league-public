import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDebounce } from "@uidotdev/usehooks";

interface FavoriteSelectorProps {
    entityType: "brand" | "manufacturer" | "pharmacy" | "cannabis_strain";
    label: string;
    currentFavorite?: { id: number; name: string; imageUrl?: string | null } | null;
    onSelect: (id: number) => void;
}

export function FavoriteSelector({
    entityType,
    label,
    currentFavorite,
    onSelect,
}: FavoriteSelectorProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const debouncedSearch = useDebounce(search, 300);

    const { data: searchResults, isLoading } = trpc.favorite.searchEntities.useQuery(
        { entityType, search: debouncedSearch, limit: 20 },
        { enabled: open }
    );

    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white/70">{label}</label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    >
                        {currentFavorite ? (
                            <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={currentFavorite.imageUrl || undefined} />
                                    <AvatarFallback className="text-[10px] bg-white/10">
                                        {currentFavorite.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{currentFavorite.name}</span>
                            </div>
                        ) : (
                            <span className="text-white/50">Select favorite...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 bg-black/90 border-white/10 text-white">
                    <Command className="bg-transparent" shouldFilter={false}>
                        <CommandInput
                            placeholder={`Search ${label.toLowerCase()}...`}
                            value={search}
                            onValueChange={setSearch}
                            className="text-white placeholder:text-white/50"
                        />
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup>
                                {searchResults?.map((item) => (
                                    <CommandItem
                                        key={item.id}
                                        value={String(item.id)}
                                        onSelect={() => {
                                            onSelect(item.id);
                                            setOpen(false);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer aria-selected:bg-white/10 text-white"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                currentFavorite?.id === item.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={item.imageUrl || undefined} />
                                            <AvatarFallback className="text-[10px] bg-white/10">
                                                {item.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span>{item.name}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
