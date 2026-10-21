import { useCallback, useEffect, useState } from "react";
import { getComplaints } from "../api/complaints.js";

export function useComplaints(initialFilters = {}) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
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
      if (Array.isArray(data)) {
        setComplaints(data);
        setTotalPages(1);
        setTotalElements(data.length);
      } else if (data && Array.isArray(data.content)) {
        setComplaints(data.content);
        setTotalPages(data.totalPages ?? 1);
        setTotalElements(data.totalElements ?? data.content.length);
      } else {
        setComplaints([]);
        setTotalPages(0);
        setTotalElements(0);
      }
    } catch (err) {
      setError(err.message || "Failed to load complaints");
      setComplaints([]);
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
    filters,
    setPage,
    updateFilters,
    reload: fetchComplaints,
  };
}
