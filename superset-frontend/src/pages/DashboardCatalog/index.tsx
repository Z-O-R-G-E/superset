import React, { useEffect, useState } from "react";

const PAGE_SIZE = 50;

interface Dashboard {
  id: number;
  dashboard_title: string;
  changed_on: string | null;
  has_access: boolean;
}

const DashboardCatalog: React.FC = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCatalog = async (page: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/dashboard_catalog/list?page=${page}&page_size=${PAGE_SIZE}`);
      const data: Dashboard[] = await res.json();
      setDashboards(data);
    } catch (err) {
      console.error("Ошибка при загрузке каталога дэшбордов:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog(page);
  }, [page]);

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (dashboards.length === PAGE_SIZE) setPage(page + 1);
  };

  return (
    <div>
      <h2>Каталог дэшбордов</h2>
      {loading && <div>Загрузка дэшбордов...</div>}
      {!loading && dashboards.length === 0 && <div>Дэшбордов нет</div>}
      <ul>
        {dashboards.map((dash) => (
          <li key={dash.id} style={{ marginBottom: "1rem" }}>
            <div>
              <strong>{dash.dashboard_title}</strong>
              {dash.changed_on && (
                <span style={{ marginLeft: "1rem", fontSize: "0.9rem", color: "#555" }}>
                  {new Date(dash.changed_on).toLocaleString()}
                </span>
              )}
            </div>
            <div style={{ marginTop: "0.3rem" }}>
              {dash.has_access ? (
                <button onClick={() => window.location.href = `/superset/dashboard/${dash.id}/`}>
                  Открыть
                </button>
              ) : (
                <button onClick={() => window.location.href = `/request_dashboard_access?dashboard_id=${dash.id}`}>
                  Запросить доступ
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: "1rem" }}>
        <button onClick={handlePrevPage} disabled={page === 1}>
          Предыдущая
        </button>
        <span style={{ margin: "0 1rem" }}>Страница {page}</span>
        <button onClick={handleNextPage} disabled={dashboards.length < PAGE_SIZE}>
          Следующая
        </button>
      </div>
    </div>
  );
};

export default DashboardCatalog;
