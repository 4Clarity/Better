import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { ProductProgramsList } from '@/components/business-operations/ProductProgramsList';
import { ProductProgramForm } from '@/components/business-operations/ProductProgramForm';
import { ProductProgramDetail } from '@/components/business-operations/ProductProgramDetail';

export function ProductsProgramsPage() {
  return (
    <Routes>
      <Route index element={<ProductProgramsList />} />
      <Route path="new" element={<CreateProductProgramPage />} />
      <Route path=":id" element={<ProductProgramDetailPage />} />
      <Route path=":id/edit" element={<EditProductProgramPage />} />
    </Routes>
  );
}

function CreateProductProgramPage() {
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <h2 className="text-2xl font-semibold mb-6">Create Product/Program</h2>
      <ProductProgramForm
        mode="create"
        onSuccess={() => navigate('/business-operations/products-programs')}
        onCancel={() => navigate('/business-operations/products-programs')}
      />
    </div>
  );
}

function ProductProgramDetailPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div className="p-8">Invalid product/program ID</div>;
  }

  return <ProductProgramDetail id={id} />;
}

function EditProductProgramPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [productProgram, setProductProgram] = useState<ProductProgram | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const data = await getProductProgramById(id);
        setProductProgram(data);
      } catch (error) {
        console.error('Failed to fetch product/program:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (!id) {
    return <div className="p-8">Invalid product/program ID</div>;
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!productProgram) {
    return <div className="p-8">Product/Program not found</div>;
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-semibold mb-6">Edit Product/Program</h2>
      <ProductProgramForm
        mode="edit"
        initialData={productProgram}
        onSuccess={() => navigate(`/business-operations/products-programs/${id}`)}
        onCancel={() => navigate(`/business-operations/products-programs/${id}`)}
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { getProductProgramById } from '@/services/productProgramApi';
import { ProductProgram } from '@/types/productProgram';
