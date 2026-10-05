'use client';

import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export default function Pagination({ currentPage, totalPages }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const createPageUrl = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const pages = [];
  const maxVisible = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '4rem', flexWrap: 'wrap' }}>
      {currentPage > 1 && (
        <Link 
          href={createPageUrl(currentPage - 1)} 
          style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155', textDecoration: 'none', background: 'white' }}
        >
          &laquo;
        </Link>
      )}

      {startPage > 1 && (
        <>
          <Link href={createPageUrl(1)} style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155', textDecoration: 'none', background: 'white' }}>1</Link>
          {startPage > 2 && <span style={{ padding: '0.5rem 0.5rem', color: '#94a3b8' }}>...</span>}
        </>
      )}

      {pages.map(page => (
        <Link 
          key={page} 
          href={createPageUrl(page)} 
          style={{ 
            padding: '0.5rem 1rem', 
            border: '1px solid', 
            borderColor: page === currentPage ? 'var(--primary)' : '#e2e8f0', 
            borderRadius: '8px', 
            color: page === currentPage ? 'white' : '#334155', 
            backgroundColor: page === currentPage ? 'var(--primary)' : 'white',
            textDecoration: 'none',
            fontWeight: page === currentPage ? 'bold' : 'normal'
          }}
        >
          {page}
        </Link>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span style={{ padding: '0.5rem 0.5rem', color: '#94a3b8' }}>...</span>}
          <Link href={createPageUrl(totalPages)} style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155', textDecoration: 'none', background: 'white' }}>{totalPages}</Link>
        </>
      )}

      {currentPage < totalPages && (
        <Link 
          href={createPageUrl(currentPage + 1)} 
          style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155', textDecoration: 'none', background: 'white' }}
        >
          &raquo;
        </Link>
      )}
    </div>
  );
}
