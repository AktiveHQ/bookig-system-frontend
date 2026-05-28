import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).trim().replace(/\/$/, '');

type Bank = {
  id: number;
  name: string;
  code: string;
};

type BankSelectProps = {
  value: string;
  onChange: (bankName: string) => void;
  onBankSelect?: (bank: Bank) => void;
};

const BankSelect = ({ value, onChange, onBankSelect }: BankSelectProps) => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [search, setSearch] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    const selectedBank = banks.find(bank => bank.name === value);
    if (selectedBank) {
      onBankSelect?.(selectedBank);
    }
  }, [banks, onBankSelect, value]);

  useEffect(() => {
    let isMounted = true;

    const loadBanks = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/public/paystack/banks`);
        if (!response.ok) {
          throw new Error(`Banks request failed with ${response.status}`);
        }

        const data = await response.json();
        if (isMounted) {
          setBanks(Array.isArray(data?.data) ? data.data : []);
        }
      } catch (error) {
        console.error('[BankSelect] Failed to load banks:', error);
        if (isMounted) {
          toast({
            title: 'Could not load banks',
            description: 'Please check your connection and try again.',
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadBanks();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredBanks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return banks;
    }

    return banks.filter(bank =>
      bank.name.toLowerCase().includes(normalizedSearch),
    );
  }, [banks, search]);

  const handleSelect = (bank: Bank) => {
    onChange(bank.name);
    onBankSelect?.(bank);
    setSearch(bank.name);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder={loading ? 'Loading banks...' : 'Search bank'}
        value={search}
        onChange={event => {
          setSearch(event.target.value);
          onChange(event.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 100)}
        className="h-12 rounded-xl"
        autoComplete="off"
      />

      {showDropdown && filteredBanks.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-background shadow-lg">
          {filteredBanks.map(bank => (
            <li
              key={bank.id}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
              onMouseDown={event => event.preventDefault()}
              onClick={() => handleSelect(bank)}
            >
              {bank.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BankSelect;
