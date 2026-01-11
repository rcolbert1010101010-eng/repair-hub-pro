import * as React from 'react';
import { ChevronsUpDown, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type SmartSearchItem = {
  id: string;
  label: string;
  searchText: string;
  meta?: Record<string, unknown>;
};

export type SmartSearchSelectProps = {
  value: string | null;
  onChange: (id: string | null) => void;
  items: SmartSearchItem[];
  placeholder?: string;
  emptyMessage?: string;
  minChars?: number;
  limit?: number;
  renderItem?: (item: SmartSearchItem) => React.ReactNode;
  label?: string;
  disabled?: boolean;
  className?: string;
};

export function SmartSearchSelect(props: SmartSearchSelectProps) {
  const {
    value,
    onChange,
    items,
    placeholder = 'Search…',
    emptyMessage = 'No results found.',
    minChars = 2,
    limit = 25,
    renderItem,
    label,
    disabled,
    className,
  } = props;

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const selectedItem = React.useMemo(
    () => items.find((i) => i.id === value) ?? null,
    [items, value]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const canSearch = normalizedQuery.length >= minChars;

  const filteredItems = React.useMemo(() => {
    if (!canSearch) return [] as SmartSearchItem[];

    return items
      .filter((item) => {
        const text = (item.searchText ?? '').toString().toLowerCase();
        if (!text) return false;
        return text.includes(normalizedQuery);
      })
      .slice(0, limit);
  }, [items, normalizedQuery, canSearch, limit]);

  const handleSelect = (id: string) => {
    if (id === value) {
      onChange(null);
    } else {
      onChange(id);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <Label className="mb-1">{label}</Label>}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            type="button"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              !selectedItem && 'text-muted-foreground'
            )}
          >
            {selectedItem ? selectedItem.label : placeholder}
            <div className="flex items-center gap-1">
              {selectedItem && !disabled && (
                <X
                  className="h-3 w-3 text-muted-foreground"
                  onClick={handleClear}
                />
              )}
              <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          className="min-w-[480px] w-[min(720px,100vw-2rem)] p-0"
        >
          <Command shouldFilter={false}>
            <div className="p-2">
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder={placeholder}
              />
            </div>
            <CommandList className="max-h-80 overflow-y-auto">
              {!canSearch && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Type at least {minChars} characters to search.
                </div>
              )}

              {canSearch && filteredItems.length === 0 && (
                <CommandEmpty>{emptyMessage}</CommandEmpty>
              )}

              {canSearch && filteredItems.length > 0 && (
                <CommandGroup>
                  {filteredItems.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => handleSelect(item.id)}
                    >
                      {renderItem ? renderItem(item) : item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
