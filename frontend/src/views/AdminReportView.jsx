// =========================================================================
// ADMIN SALES REPORTING & ANALYTICS DASHBOARD VIEW
// Purpose: Aggregates billing records and draws trends line graphs, category pie splits,
//          and performance listings. Integrates Chart.js.
// Used in: frontend/src/App.jsx
// =========================================================================

import React, { useState, useEffect } from 'react';
import { Download, Calendar, Filter, Users, DollarSign, ShoppingCart, BarChart2 } from 'lucide-react';
import api from '../services/api';

// Import Chart.js components
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

// Register Chart.js plug-ins for rendering on dark theme canvas
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AdminReportView = () => {
  // Query Filters States
  const [period, setPeriod] = useState('Today'); // Today | This Week | This Month | Custom
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Master lists for filters
  const [employees, setEmployees] = useState([]);

  // Aggregate Metrics States
  const [summary, setSummary] = useState({ totalOrders: 0, totalRevenue: 0.00, averageOrderValue: 0.00 });
  const [salesTrend, setSalesTrend] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [topOrders, setTopOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Initial Load: Fetch filter catalogs
  useEffect(() => {
    fetchFilterData();
  }, []);

  // 2. Trigger Reload on filter changes
  useEffect(() => {
    fetchReportData();
  }, [period, employeeId, startDate, endDate]);

  const fetchFilterData = async () => {
    try {
      const usersList = await api.users.getUsers();
      // Only show cashiers/employees in the filter dropdown list
      setEmployees(usersList.filter(u => u.role === 'Employee'));
    } catch (err) {
      console.error('Failed to load filter dropdown lists:', err);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    setError('');

    // Construct URL query strings based on active filters
    const queryParams = new URLSearchParams();
    if (period) queryParams.append('period', period);
    if (employeeId) queryParams.append('employeeId', employeeId);
    if (period === 'Custom') {
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
    }

    const queryStr = `?${queryParams.toString()}`;

    try {
      const summaryData = await api.reports.getSummary(queryStr);
      const trendData = await api.reports.getSalesTrend(queryStr);
      const topOrdersData = await api.reports.getTopOrders(queryStr);
      const topProductsData = await api.reports.getTopProducts(queryStr);
      const categorySalesData = await api.reports.getCategorySales(queryStr);

      setSummary(summaryData);
      setSalesTrend(trendData);
      setTopOrders(topOrdersData);
      setTopProducts(topProductsData);
      setCategorySales(categorySalesData);
    } catch (err) {
      setError('Failed to compute dashboard sales reports.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      let res;
      if (format === 'pdf') {
        res = await api.reports.exportPdf();
      } else {
        res = await api.reports.exportXls();
      }
      alert(res.message);
    } catch (err) {
      alert('Export failed.');
    }
  };

  // 3. Configure Chart.js Line Graph (Sales Trend over Time)
  const lineChartData = {
    labels: salesTrend.map(s => s.date),
    datasets: [{
      label: 'Revenue ($)',
      data: salesTrend.map(s => parseFloat(s.revenue)),
      borderColor: '#c83f3f', // Crimson highlight line
      backgroundColor: 'rgba(200, 63, 63, 0.1)',
      tension: 0.3,
      fill: true,
      pointBackgroundColor: '#ffffff'
    }]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // Hide legend to keep layout clean
      tooltip: { enabled: true }
    },
    scales: {
      x: {
        grid: { color: '#2e2e36' },
        ticks: { color: '#a0a0ab' }
      },
      y: {
        grid: { color: '#2e2e36' },
        ticks: { color: '#a0a0ab' }
      }
    }
  };

  // 4. Configure Chart.js Pie Graph (Top Categories Revenue Split)
  const pieChartData = {
    labels: categorySales.map(c => c.categoryName),
    datasets: [{
      data: categorySales.map(c => c.revenue),
      backgroundColor: categorySales.map(c => c.color || '#cccccc'),
      borderWidth: 1,
      borderColor: '#1a1a1e'
    }]
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#ffffff',
          font: { family: 'Outfit', size: 11 }
        }
      }
    }
  };

  return (
    <div className="main-content" style={styles.container}>
      {/* Dashboard Title & Export Buttons */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Analytics Dashboard</h1>
          <p style={styles.subtitle}>Real-time sales insights and performance charts</p>
        </div>
        <div style={styles.exportActions}>
          <button style={styles.exportBtn} onClick={() => handleExport('xls')}>
            <Download size={14} /> Export XLS
          </button>
          <button style={{...styles.exportBtn, backgroundColor: '#c83f3f'}} onClick={() => handleExport('pdf')}>
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      {/* ==========================================
          FILTER CONTROLS BAR
         ========================================== */}
      <div style={styles.filterBar}>
        <div style={styles.filterItem}>
          <label style={styles.filterLabel}><Calendar size={14} /> Period</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="Custom">Custom Range</option>
          </select>
        </div>

        {period === 'Custom' && (
          <>
            <div style={styles.filterItem}>
              <label style={styles.filterLabel}>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div style={styles.filterItem}>
              <label style={styles.filterLabel}>End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </>
        )}

        <div style={styles.filterItem}>
          <label style={styles.filterLabel}><Users size={14} /> Cashier</label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ==========================================
          SUMMARY METRICS STAT CARDS
         ========================================== */}
      <div style={styles.metricsRow}>
        <div className="card" style={styles.metricCard}>
          <div style={{...styles.iconWrapper, backgroundColor: 'rgba(200,63,63,0.15)', color: '#c83f3f'}}>
            <ShoppingCart size={24} />
          </div>
          <div>
            <div style={styles.metricLabel}>Total Orders</div>
            <div style={styles.metricValue}>{summary.totalOrders}</div>
          </div>
        </div>

        <div className="card" style={styles.metricCard}>
          <div style={{...styles.iconWrapper, backgroundColor: 'rgba(76,175,80,0.15)', color: '#4caf50'}}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={styles.metricLabel}>Total Revenue</div>
            <div style={styles.metricValue}>${summary.totalRevenue.toFixed(2)}</div>
          </div>
        </div>

        <div className="card" style={styles.metricCard}>
          <div style={{...styles.iconWrapper, backgroundColor: 'rgba(2,136,209,0.15)', color: '#0288d1'}}>
            <BarChart2 size={24} />
          </div>
          <div>
            <div style={styles.metricLabel}>Average Order Value</div>
            <div style={styles.metricValue}>${summary.averageOrderValue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* ==========================================
          CHARTS SECTION (LINE TRENDS & PIE SPITS)
         ========================================== */}
      <div style={styles.chartsRow}>
        {/* Sales Trend Line Graph */}
        <div className="card" style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Sales Trend (Revenue over Time)</h3>
          <div style={styles.chartWrapper}>
            {salesTrend.length === 0 ? (
              <div style={styles.emptyChart}>No trend data available for filter selection.</div>
            ) : (
              <Line data={lineChartData} options={lineChartOptions} />
            )}
          </div>
        </div>

        {/* Top Categories Pie Graph */}
        <div className="card" style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Revenue Split by Food Category</h3>
          <div style={styles.chartWrapper}>
            {categorySales.length === 0 ? (
              <div style={styles.emptyChart}>No category sales recorded.</div>
            ) : (
              <Pie data={pieChartData} options={pieChartOptions} />
            )}
          </div>
        </div>
      </div>

      {/* ==========================================
          PERFORMANCE LISTINGS TABLES
         ========================================== */}
      <div style={styles.listingsGrid}>
        
        {/* Table: Top Products */}
        <div className="card" style={styles.tableCard}>
          <h3 style={styles.tableCardTitle}>Top Selling Products</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity Sold</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={styles.emptyRow}>No sales registered.</td>
                  </tr>
                ) : (
                  topProducts.map(tp => (
                    <tr key={tp.productId}>
                      <td style={{ fontWeight: 600 }}>{tp.product?.name}</td>
                      <td>{tp.quantitySold} units</td>
                      <td style={{ fontWeight: 600 }}>${parseFloat(tp.revenue).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table: Top Categories */}
        <div className="card" style={styles.tableCard}>
          <h3 style={styles.tableCardTitle}>Category Sales Summary</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Revenue Share</th>
                </tr>
              </thead>
              <tbody>
                {categorySales.length === 0 ? (
                  <tr>
                    <td colSpan="2" style={styles.emptyRow}>No sales registered.</td>
                  </tr>
                ) : (
                  categorySales.map(cs => (
                    <tr key={cs.categoryId}>
                      <td style={{ fontWeight: 600 }}>
                        <div style={styles.catIndicator}>
                          <span style={{...styles.catDot, backgroundColor: cs.color}}></span>
                          <span>{cs.categoryName}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>${parseFloat(cs.revenue).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#121214',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#a0a0ab',
    marginTop: '0.25rem'
  },
  exportActions: {
    display: 'flex',
    gap: '0.75rem'
  },
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#232329',
    color: '#ffffff',
    padding: '0.6rem 1.25rem',
    fontWeight: 600,
    fontSize: '0.85rem'
  },
  errorAlert: {
    backgroundColor: 'rgba(200, 63, 63, 0.15)',
    border: '1px solid #c83f3f',
    color: '#ff5252',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem'
  },
  filterBar: {
    display: 'flex',
    gap: '1.5rem',
    backgroundColor: '#1a1a1e',
    border: '1px solid #2e2e36',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '2rem'
  },
  filterItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    minWidth: '180px'
  },
  filterLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.8rem',
    color: '#a0a0ab',
    fontWeight: 600,
    textTransform: 'uppercase'
  },
  metricsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  metricCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem'
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  metricLabel: {
    fontSize: '0.85rem',
    color: '#a0a0ab',
    fontWeight: 500
  },
  metricValue: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: '#ffffff',
    marginTop: '0.2rem'
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  chartCard: {
    height: '340px',
    display: 'flex',
    flexDirection: 'column'
  },
  chartTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    marginBottom: '1.25rem'
  },
  chartWrapper: {
    flexGrow: 1,
    position: 'relative'
  },
  emptyChart: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#6f6f76',
    fontSize: '0.9rem'
  },
  listingsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem'
  },
  tableCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  tableCardTitle: {
    fontSize: '1.1rem',
    fontWeight: 600
  },
  emptyRow: {
    textAlign: 'center',
    padding: '2rem',
    color: '#6f6f76'
  },
  catIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  catDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block'
  }
};

export default AdminReportView;
