import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProductPrograms } from '@/services/productProgramApi';
import {
  ProductProgram,
  ProductProgramFilters,
  SecurityClassification,
} from '@/types/productProgram';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ProductProgramsList() {
  const navigate = useNavigate();
  const permissions = usePermissions();
  const [productPrograms, setProductPrograms] = useState<ProductProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClassification, setFilterClassification] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const canCreate = permissions.canPerformOperation(
    'Business Operations',
    'Products/Programs',
    'create'
  );

  const fetchProductPrograms = async () => {
    try {
      setLoading(true);
      const filters: ProductProgramFilters = {
        page: currentPage,
        limit,
        search: searchTerm || undefined,
        securityClassification: filterClassification
          ? (filterClassification as SecurityClassification)
          : undefined,
      };

      const response = await getProductPrograms(filters);
      setProductPrograms(response.data);
      setTotalPages(response.pagination.pages);
      setTotal(response.pagination.total);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch Products/Programs:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch Products/Programs';
      setError(errorMessage);
      setProductPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductPrograms();
  }, [currentPage, searchTerm, filterClassification]);

  const getSecurityClassificationBadge = (classification: SecurityClassification) => {
    const styles = {
      UNCLASSIFIED:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      CUI: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      SECRET: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      TOP_SECRET: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return styles[classification] || styles.UNCLASSIFIED;
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Products & Programs</h2>
          <p className="text-muted-foreground">
            Manage operational products and programs
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate('/business-operations/products-programs/new')}>
            Create Product/Program
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Input
          placeholder="Search by name or description..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // Reset to first page on search
          }}
        />
        <Select
          value={filterClassification}
          onValueChange={(value) => {
            setFilterClassification(value);
            setCurrentPage(1); // Reset to first page on filter
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by security classification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classifications</SelectItem>
            <SelectItem value="UNCLASSIFIED">Unclassified</SelectItem>
            <SelectItem value="CUI">CUI</SelectItem>
            <SelectItem value="SECRET">Secret</SelectItem>
            <SelectItem value="TOP_SECRET">Top Secret</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-4">
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">Loading products and programs...</div>
        </div>
      ) : productPrograms.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-16 h-16 mx-auto text-muted-foreground/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium mb-2">No products or programs found</p>
          {canCreate && (
            <p>Click "Create Product/Program" to create your first entry!</p>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {productPrograms.map((program) => (
              <div
                key={program.id}
                className="border rounded-lg p-6 shadow-sm bg-card hover:shadow-md transition-all cursor-pointer hover:border-primary/20 group"
                onClick={() =>
                  navigate(`/business-operations/products-programs/${program.id}`)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate(`/business-operations/products-programs/${program.id}`);
                  }
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                      {program.name}
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getSecurityClassificationBadge(
                      program.securityClassification
                    )}`}
                  >
                    {program.securityClassification ? program.securityClassification.replace('_', ' ') : 'Unclassified'}
                  </span>
                </div>

                <p className="text-muted-foreground mb-3 line-clamp-2">
                  {program.objectives}
                </p>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {program.criticalDates?.length || 0} critical date(s)
                  </div>
                  <div className="text-sm text-primary font-medium group-hover:translate-x-1 transition-transform">
                    View details →
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({total} total)
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
