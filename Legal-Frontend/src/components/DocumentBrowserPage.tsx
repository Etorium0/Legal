import React from 'react';
import SimpleLayout from './SimpleLayout';
import PhapDienView from './phapdien/PhapDienView';
import { useDocumentBrowser } from '../hooks/useDocumentBrowser';
import { DocumentSearchFilters } from './document-browser/DocumentSearchFilters';
import { RecommendationBox } from './document-browser/RecommendationBox';
import { DocumentGrid } from './document-browser/DocumentGrid';
import { DocumentDetail } from './document-browser/DocumentDetail';

const DocumentBrowserPage: React.FC = () =>
{
  const {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    loading,
    error,
    selectedDoc,
    setSelectedDoc,
    units,
    unitsLoading,
    unitsError,
    tree,
    treeLoading,
    treeError,
    treeSearch,
    setTreeSearch,
    filteredTree,
    selectedUnit,
    setSelectedUnit,
    citationsOut,
    citationsIn,
    citationsLoading,
    citationsError,
    unitDetailText,
    unitDetailLoading,
    unitDetailError,
    recoKeyword,
    setRecoKeyword,
    recoItems,
    recoLoading,
    recoError,
    fetchRecommend,
    docTypeFilter,
    setDocTypeFilter,
    yearFrom,
    setYearFrom,
    yearTo,
    setYearTo,
    authorityFilter,
    setAuthorityFilter,
    statusFilter,
    setStatusFilter,
    levelsFilter,
    setLevelsFilter,
    filteredDocs,
  } = useDocumentBrowser();

  return (
    <SimpleLayout>
      <div>
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'vbpl'
                ? 'bg-indigo-600 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => setActiveTab('vbpl')}
          >
            Danh sách VBPL
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'phapdien'
                ? 'bg-indigo-600 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => setActiveTab('phapdien')}
          >
            Duyệt theo loại
          </button>
        </div>

        {activeTab === 'phapdien' && <PhapDienView />}

        {activeTab === 'vbpl' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white">Trình duyệt tài liệu</h2>
                <p className="mt-2 text-white/70">
                  Tìm kiếm và xem chi tiết văn bản pháp luật.
                </p>
              </div>
            </div>

            <DocumentSearchFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              docTypeFilter={docTypeFilter}
              setDocTypeFilter={setDocTypeFilter}
              yearFrom={yearFrom}
              setYearFrom={setYearFrom}
              yearTo={yearTo}
              setYearTo={setYearTo}
              authorityFilter={authorityFilter}
              setAuthorityFilter={setAuthorityFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              levelsFilter={levelsFilter}
              setLevelsFilter={setLevelsFilter}
            />

            <RecommendationBox
              recoKeyword={recoKeyword}
              setRecoKeyword={setRecoKeyword}
              fetchRecommend={fetchRecommend}
              recoLoading={recoLoading}
              recoError={recoError}
              recoItems={recoItems}
            />

            <DocumentGrid
              loading={loading}
              error={error}
              filteredDocs={filteredDocs}
              setSelectedDoc={setSelectedDoc}
            />

            {selectedDoc && (
              <DocumentDetail
                selectedDoc={selectedDoc}
                setSelectedDoc={setSelectedDoc}
                unitsLoading={unitsLoading}
                unitsError={unitsError}
                units={units}
                selectedUnit={selectedUnit}
                setSelectedUnit={setSelectedUnit}
                treeLoading={treeLoading}
                treeError={treeError}
                tree={tree}
                filteredTree={filteredTree}
                treeSearch={treeSearch}
                setTreeSearch={setTreeSearch}
                unitDetailLoading={unitDetailLoading}
                unitDetailError={unitDetailError}
                unitDetailText={unitDetailText}
                citationsLoading={citationsLoading}
                citationsError={citationsError}
                citationsOut={citationsOut}
                citationsIn={citationsIn}
              />
            )}
          </div>
        )}
      </div>
    </SimpleLayout>
  );
};

export default DocumentBrowserPage;
