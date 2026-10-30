import { useCallback, useEffect, useState } from "react";
import { getComplaints } from "../api/complaints.js";

export function useComplaints(initialFilters = {}) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [counts, setCounts] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "ALL",
    category: "ALL",
    priority: "ALL",
    sort: "NEWEST",
    ...initialFilters,
  });

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getComplaints({ ...filters, page, size: 10 });
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.complaints)
        ? data.complaints
        : Array.isArray(data?.content)
        ? data.content
        : [];

      setComplaints(items);
      setTotalPages(data?.totalPages ?? (items.length ? 1 : 0));
      setTotalElements(data?.totalElements ?? items.length);
      if (data?.counts) {
        setCounts(data.counts);
      }
    } catch (err) {
      setError(err.message || "Failed to load complaints");
      setComplaints([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const updateFilters = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(0);
  };

  return {
    complaints,
    loading,
    error,
    page,
    totalPages,
    totalElements,
    counts,
    filters,
    setPage,
    updateFilters,
    reload: fetchComplaints,
  };
}
