import { useState } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { Input } from "./ui/input";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setLocation(`/p/${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative flex items-center max-w-sm w-full">
      <Search className="absolute left-3 text-white/50" size={16} />
      <Input
        type="text"
        placeholder="Search developers by username..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-9 bg-[#1A1A1A] border-[#333] text-white focus:border-[#00FF00] h-9 w-full font-mono text-sm"
      />
    </form>
  );
}
