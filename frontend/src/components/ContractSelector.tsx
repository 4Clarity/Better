import { useState, useEffect } from "react";
import { contractApi, businessOperationApi, Contract, BusinessOperation } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Building, FileText, CheckCircle } from "lucide-react";

interface ContractSelectorProps {
  selectedContract?: Contract | null;
  onContractSelect: (contract: Contract) => void;
  businessOperationId?: string;
  disabled?: boolean;
  className?: string;
}

export function ContractSelector({ 
  selectedContract, 
  onContractSelect, 
  businessOperationId,
  disabled = false,
  className = ""
}: ContractSelectorProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [businessOperations, setBusinessOperations] = useState<BusinessOperation[]>([]);
  const [selectedBusinessOpId, setSelectedBusinessOpId] = useState<string>(businessOperationId || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch business operations on component mount
  useEffect(() => {
    fetchBusinessOperations();
  }, []);

  // Fetch contracts when business operation changes
  useEffect(() => {
    if (selectedBusinessOpId) {
      fetchContractsByBusinessOperation(selectedBusinessOpId);
    } else {
      setContracts([]);
    }
  }, [selectedBusinessOpId]);

  // Initialize business operation from selected contract
  useEffect(() => {
    if (selectedContract && selectedContract.businessOperationId && !selectedBusinessOpId) {
      console.log('Setting business operation from selected contract:', selectedContract.businessOperationId);
      setSelectedBusinessOpId(selectedContract.businessOperationId);
    }
  }, [selectedContract, selectedBusinessOpId]);

  const fetchBusinessOperations = async () => {
    try {
      const response = await businessOperationApi.getAll();
      console.log('Business operations API response:', response);
      
      // Business operations API returns PaginatedResponse<BusinessOperation> with data property
      const operations = response?.data || [];
      setBusinessOperations(operations);
    } catch (err) {
      console.error('Failed to fetch business operations:', err);
      setError('Failed to load business operations');
      setBusinessOperations([]); // Ensure it's always an array
    }
  };

  const fetchContractsByBusinessOperation = async (businessOpId: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching contracts for business operation:', businessOpId);
      const fetchedContracts = await contractApi.getByBusinessOperation(businessOpId);
      console.log('Fetched contracts:', fetchedContracts);
      setContracts(fetchedContracts);
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
      setError('Failed to load contracts');
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(contract => 
    contract.contractName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.contractorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: Contract['status']) => {
    const colors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'PLANNING': 'bg-blue-100 text-blue-800',
      'RENEWAL': 'bg-yellow-100 text-yellow-800',
      'EXPIRING': 'bg-orange-100 text-orange-800',
      'EXPIRED': 'bg-red-100 text-red-800',
      'EXTENDED': 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleContractSelect = (contract: Contract) => {
    onContractSelect(contract);
    setShowDropdown(false);
    setSearchTerm("");
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
          Debug: BO={selectedBusinessOpId ? 'selected' : 'none'}, 
          Contracts={contracts.length}, 
          Filtered={filteredContracts.length}, 
          ShowDropdown={showDropdown ? 'yes' : 'no'},
          Loading={loading ? 'yes' : 'no'}
        </div>
      )}
      
      {/* Business Operation Selector */}
      <div>
        <Label htmlFor="businessOperationSelect">Business Operation</Label>
        <select
          id="businessOperationSelect"
          name="businessOperationSelect"
          value={selectedBusinessOpId}
          onChange={(e) => setSelectedBusinessOpId(e.target.value)}
          disabled={disabled || !!businessOperationId} // Disable if passed as prop
          autoComplete="organization"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Select a Business Operation...</option>
          {Array.isArray(businessOperations) && businessOperations.map((businessOp) => (
            <option key={businessOp.id} value={businessOp.id}>
              {businessOp.name} - {businessOp.businessFunction}
            </option>
          ))}
        </select>
      </div>

      {/* Contract Selector */}
      <div className="relative">
        <Label htmlFor="contractSelectorInput">Contract Selection</Label>
        <div className="relative">
          <Input
            id="contractSelectorInput"
            name="contractSelector"
            type="search"
            autoComplete="off"
            placeholder={selectedContract ? 
              `${selectedContract.contractName} (${selectedContract.contractNumber})` : 
              selectedBusinessOpId ? "Search contracts..." : "Select a Business Operation first"
            }
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              if (selectedBusinessOpId) {
                setShowDropdown(true);
                console.log('Focus: showing dropdown for business op:', selectedBusinessOpId);
              }
            }}
            onClick={() => {
              if (selectedBusinessOpId) {
                setShowDropdown(true);
                console.log('Click: showing dropdown');
              }
            }}
            disabled={disabled || !selectedBusinessOpId}
            className="pr-16"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
            role="combobox"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-8 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => {
              if (selectedBusinessOpId) {
                setShowDropdown(!showDropdown);
                console.log('Toggle dropdown:', !showDropdown);
              }
            }}
            disabled={disabled || !selectedBusinessOpId}
          >
            <Search className="h-4 w-4 text-gray-400" />
          </Button>
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
            {contracts.length > 0 && `${filteredContracts.length}/${contracts.length}`}
          </div>
        </div>

        {/* Dropdown */}
        {showDropdown && selectedBusinessOpId && (
          <div 
            className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-xl max-h-64 overflow-y-auto"
            role="listbox"
            aria-label="Contract options"
          >
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading contracts...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">{error}</div>
            ) : filteredContracts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? "No contracts match your search" : "No contracts available"}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredContracts.map((contract) => (
                  <div 
                    key={contract.id} 
                    className="cursor-pointer hover:bg-gray-50 transition-colors border rounded p-3"
                    onClick={() => handleContractSelect(contract)}
                    role="option"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleContractSelect(contract);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <h4 className="font-medium text-sm truncate">{contract.contractName}</h4>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <FileText className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-600">{contract.contractNumber}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Contractor: {contract.contractorName}
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(contract.status)} text-xs ml-2 flex-shrink-0`}>
                        {contract.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Contract Display */}
      {selectedContract && (
        <div className="mt-4">
          <Label>Selected Contract</Label>
          <Card className="mt-1">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">{selectedContract.contractName}</h4>
                    <p className="text-sm text-gray-600">Contract: {selectedContract.contractNumber}</p>
                    <p className="text-xs text-gray-500">Contractor: {selectedContract.contractorName}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(selectedContract.status)}>
                  {selectedContract.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}