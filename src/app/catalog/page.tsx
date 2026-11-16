'use client';
import { CatalogList } from '../../components/catalog/catalog-list';
import { SHELL_COPY } from '../../components/shell/copy';

export default function CatalogPage() {
  return (
    <main data-tab="catalog" style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
      <h1>{SHELL_COPY.catalogHeading}</h1>
      <CatalogList />
    </main>
  );
}
