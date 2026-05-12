import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart
} from 'recharts';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4','#a3e635'];

const fmt = (n) => n >= 1e6
  ? `R$ ${(n/1e6).toFixed(2)}M`
  : n >= 1e3
  ? `R$ ${(n/1e3).toFixed(1)}k`
  : `R$ ${n.toFixed(0)}`;

const fmtFull = (n) =>
  'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

const MES_LABEL = { 1:'Jan',2:'Fev',3:'Mar',4:'Abr',5:'Mai',6:'Jun',7:'Jul',8:'Ago',9:'Set',10:'Out',11:'Nov',12:'Dez' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1e2535', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
      <div style={{ color:'#8892a4', marginBottom:6, fontWeight:600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display:'flex', gap:12, justifyContent:'space-between' }}>
          <span>{p.name}</span>
          <span style={{ fontWeight:600 }}>
            {typeof p.value === 'number' && p.name?.toLowerCase().includes('ticket')
              ? fmtFull(p.value)
              : typeof p.value === 'number'
              ? fmt(p.value)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background:'#1e2535', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 12px', fontSize:12 }}>
      <div style={{ color: d.payload.fill, fontWeight:600 }}>{d.name}</div>
      <div style={{ color:'#e8eaf0' }}>{fmt(d.value)}</div>
      <div style={{ color:'#8892a4' }}>{d.payload.pct?.toFixed(1)}%</div>
    </div>
  );
};

const SHEET_ID = '1FscPGGWQsSbIkZDbJbHuTo3g6P3uvdDlTj8j-Dabc9Q';
const SHEET_NAME = 'receita';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

function useData() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    Papa.parse(`${SHEET_URL}&cachebust=${Date.now()}`, {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const clean = data.filter(r => r.Receita != null && r.STATUS === 'Completo');
        setRows(clean);
        setLastUpdated(new Date());
        setLoading(false);
      },
      error: (err) => {
        setError('Erro ao carregar dados. Verifique se a planilha está pública.');
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { rows, loading, error, lastUpdated, refresh: fetchData };
}

function MultiCheck({ options, selected, onChange }) {
  const all = selected.length === options.length;
  const toggle = (v) => {
    if (selected.includes(v)) onChange(selected.filter(x => x !== v));
    else onChange([...selected, v]);
  };
  const toggleAll = () => onChange(all ? [] : [...options]);
  return (
    <div className="multi-select">
      <label>
        <input type="checkbox" checked={all} onChange={toggleAll} />
        <span style={{ color: '#8892a4' }}>Todos</span>
      </label>
      {options.map(o => (
        <label key={o}>
          <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} />
          <span>{o || '(vazio)'}</span>
        </label>
      ))}
    </div>
  );
}

function KpiCard({ label, value, sub, color, delta }) {
  return (
    <div className="kpi-card" style={{ borderTop: `2px solid ${color || 'transparent'}` }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color: color || '#e8eaf0' }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {delta != null && (
        <div className={`kpi-delta ${delta >= 0 ? 'delta-pos' : 'delta-neg'}`}>
          {fmtPct(delta)} vs período anterior
        </div>
      )}
    </div>
  );
}

function TopList({ data, label, valueKey = 'receita', color = '#3b82f6', limit = 10 }) {
  const top = data.slice(0, limit);
  const max = top[0]?.[valueKey] || 1;
  return (
    <div className="top-list">
      {top.map((d, i) => (
        <div key={i} className="top-item">
          <div className="top-name" title={d[label]}>{d[label] || '(vazio)'}</div>
          <div className="top-bar-bg">
            <div className="top-bar-fill" style={{ width: `${(d[valueKey]/max)*100}%`, background: COLORS[i % COLORS.length] }} />
          </div>
          <div className="top-val">{fmt(d[valueKey])}</div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const { rows, loading, error, lastUpdated, refresh } = useData();

  const allChannels = useMemo(() => [...new Set(rows.map(r => r.CHANNEL_GROUP || 'Vazio'))].sort(), [rows]);
  const allClassif = useMemo(() => [...new Set(rows.map(r => r.CLASSIFICACAO_COMPRADOR))].sort(), [rows]);
  const allTipoRec = useMemo(() => [...new Set(rows.map(r => r.TIPO_RECEITA))].sort(), [rows]);
  const allFontes = useMemo(() => [...new Set(rows.map(r => r.FONTE_PEDIDO))].sort(), [rows]);
  const allSources = useMemo(() => [...new Set(rows.map(r => r.UTM_SOURCE || 'Orgânico'))].sort(), [rows]);
  const allMediums = useMemo(() => [...new Set(rows.map(r => r.UTM_MEDIUM || '(sem medium)'))].sort(), [rows]);
  const allAnos = useMemo(() => [...new Set(rows.map(r => r.ANO))].sort(), [rows]);

  const [channels, setChannels] = useState([]);
  const [classifs, setClassifs] = useState([]);
  const [tiposRec, setTiposRec] = useState([]);
  const [fontes, setFontes] = useState([]);
  const [sources, setSources] = useState([]);
  const [mediums, setMediums] = useState([]);
  const [anos, setAnos] = useState([]);
  const [granularity, setGranularity] = useState('month');
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (!loading) {
      setChannels([...allChannels]);
      setClassifs([...allClassif]);
      setTiposRec([...allTipoRec]);
      setFontes([...allFontes]);
      setSources([...allSources]);
      setMediums([...allMediums]);
      setAnos([...allAnos]);
    }
  }, [loading]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const ch = r.CHANNEL_GROUP || 'Vazio';
      const src = r.UTM_SOURCE || 'Orgânico';
      const med = r.UTM_MEDIUM || '(sem medium)';
      return channels.includes(ch)
        && classifs.includes(r.CLASSIFICACAO_COMPRADOR)
        && tiposRec.includes(r.TIPO_RECEITA)
        && fontes.includes(r.FONTE_PEDIDO)
        && sources.includes(src)
        && mediums.includes(med)
        && anos.includes(r.ANO);
    });
  }, [rows, channels, classifs, tiposRec, fontes, sources, mediums, anos]);

  const resetFilters = useCallback(() => {
    setChannels([...allChannels]);
    setClassifs([...allClassif]);
    setTiposRec([...allTipoRec]);
    setFontes([...allFontes]);
    setSources([...allSources]);
    setMediums([...allMediums]);
    setAnos([...allAnos]);
  }, [allChannels, allClassif, allTipoRec, allFontes, allSources, allMediums, allAnos]);

  const totalReceita = useMemo(() => filtered.reduce((s, r) => s + r.Receita, 0), [filtered]);
  const totalQtd = useMemo(() => filtered.reduce((s, r) => s + r.Qtd, 0), [filtered]);
  const totalOrders = filtered.length;
  const ticketMedio = totalQtd > 0 ? totalReceita / totalQtd : 0;
  const receitaAcq = useMemo(() => filtered.filter(r => r.CLASSIFICACAO_COMPRADOR === 'Aquisição').reduce((s,r) => s + r.Receita, 0), [filtered]);
  const receitaRen = useMemo(() => filtered.filter(r => r.CLASSIFICACAO_COMPRADOR === 'Renovação').reduce((s,r) => s + r.Receita, 0), [filtered]);

  const timeSeriesData = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const key = granularity === 'month'
        ? `${r.ANO}-${String(r.MES).padStart(2,'0')}`
        : String(r.ANO);
      if (!map[key]) map[key] = { period: key, receita: 0, acq: 0, ren: 0, qtd: 0, orders: 0 };
      map[key].receita += r.Receita;
      map[key].qtd += r.Qtd;
      map[key].orders += 1;
      if (r.CLASSIFICACAO_COMPRADOR === 'Aquisição') map[key].acq += r.Receita;
      else map[key].ren += r.Receita;
    });
    return Object.values(map)
      .sort((a, b) => a.period.localeCompare(b.period))
      .map(d => ({
        ...d,
        label: granularity === 'month'
          ? `${MES_LABEL[parseInt(d.period.split('-')[1])]}/${d.period.split('-')[0].slice(2)}`
          : d.period,
        ticket: d.qtd > 0 ? d.receita / d.qtd : 0
      }));
  }, [filtered, granularity]);

  const byChannel = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const k = r.CHANNEL_GROUP || 'Vazio';
      if (!map[k]) map[k] = { channel: k, receita: 0, qtd: 0, orders: 0 };
      map[k].receita += r.Receita;
      map[k].qtd += r.Qtd;
      map[k].orders += 1;
    });
    const total = Object.values(map).reduce((s, d) => s + d.receita, 0) || 1;
    return Object.values(map)
      .sort((a, b) => b.receita - a.receita)
      .map(d => ({ ...d, pct: (d.receita / total) * 100, fill: COLORS[Object.keys(map).indexOf(d.channel) % COLORS.length] }));
  }, [filtered]);

  const byTipoRec = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const k = r.TIPO_RECEITA || '(vazio)';
      if (!map[k]) map[k] = { tipo: k, receita: 0, qtd: 0, orders: 0 };
      map[k].receita += r.Receita;
      map[k].qtd += r.Qtd;
      map[k].orders += 1;
    });
    const total = Object.values(map).reduce((s, d) => s + d.receita, 0) || 1;
    return Object.values(map)
      .sort((a, b) => b.receita - a.receita)
      .map((d, i) => ({ ...d, pct: (d.receita / total) * 100, fill: COLORS[i % COLORS.length] }));
  }, [filtered]);

  const byClassif = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const k = r.CLASSIFICACAO_COMPRADOR || '(vazio)';
      if (!map[k]) map[k] = { classif: k, receita: 0, qtd: 0 };
      map[k].receita += r.Receita;
      map[k].qtd += r.Qtd;
    });
    const total = Object.values(map).reduce((s, d) => s + d.receita, 0) || 1;
    return Object.values(map)
      .sort((a, b) => b.receita - a.receita)
      .map((d, i) => ({ ...d, pct: (d.receita / total) * 100, fill: COLORS[i % COLORS.length] }));
  }, [filtered]);

  const byOffer = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const k = r.NOME_OFERTA || '(sem oferta)';
      if (!map[k]) map[k] = { oferta: k, receita: 0, qtd: 0, orders: 0 };
      map[k].receita += r.Receita;
      map[k].qtd += r.Qtd;
      map[k].orders += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.receita - a.receita)
      .map(d => ({ ...d, ticket: d.qtd > 0 ? d.receita / d.qtd : 0 }));
  }, [filtered]);

  const bySource = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const k = r.UTM_SOURCE || 'Orgânico';
      if (!map[k]) map[k] = { source: k, receita: 0, orders: 0 };
      map[k].receita += r.Receita;
      map[k].orders += 1;
    });
    return Object.values(map).sort((a, b) => b.receita - a.receita);
  }, [filtered]);

  const byMedium = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const k = r.UTM_MEDIUM || '(sem medium)';
      if (!map[k]) map[k] = { medium: k, receita: 0, orders: 0 };
      map[k].receita += r.Receita;
      map[k].orders += 1;
    });
    return Object.values(map).sort((a, b) => b.receita - a.receita);
  }, [filtered]);

  const byCampaign = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const k = r.SNCCAMPANHA || r.UTM_MEDIUM || '(sem campanha)';
      if (!map[k]) map[k] = { campanha: k, receita: 0, orders: 0 };
      map[k].receita += r.Receita;
      map[k].orders += 1;
    });
    return Object.values(map).sort((a, b) => b.receita - a.receita);
  }, [filtered]);

  const byFonte = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const k = r.FONTE_PEDIDO || '(vazio)';
      if (!map[k]) map[k] = { fonte: k, receita: 0, orders: 0 };
      map[k].receita += r.Receita;
      map[k].orders += 1;
    });
    const total = Object.values(map).reduce((s, d) => s + d.receita, 0) || 1;
    return Object.values(map)
      .sort((a, b) => b.receita - a.receita)
      .map((d, i) => ({ ...d, pct: (d.receita / total) * 100, fill: COLORS[i % COLORS.length] }));
  }, [filtered]);

  const ticketDistrib = useMemo(() => {
    const buckets = [
      { label: 'R$0', min: 0, max: 0.01 },
      { label: 'R$1–30', min: 0.01, max: 30 },
      { label: 'R$31–100', min: 30, max: 100 },
      { label: 'R$101–300', min: 100, max: 300 },
      { label: 'R$301–500', min: 300, max: 500 },
      { label: 'R$501–1k', min: 500, max: 1000 },
      { label: 'R$1k+', min: 1000, max: Infinity },
    ];
    const map = {};
    buckets.forEach(b => { map[b.label] = { label: b.label, receita: 0, orders: 0, min: b.min, max: b.max }; });
    filtered.forEach(r => {
      const t = r.Qtd > 0 ? r.Receita / r.Qtd : r.Receita;
      const b = buckets.find(b => t >= b.min && t < b.max);
      if (b) { map[b.label].receita += r.Receita; map[b.label].orders += 1; }
    });
    return Object.values(map);
  }, [filtered]);

  const tabData = { overview: null, canal: null, oferta: null, canal_digital: null, ticket: null };

  if (loading && rows.length === 0) return (
    <div className="app">
      <div className="topbar"><div className="topbar-logo">Suno <span>Dashboard</span></div></div>
      <div className="loading"><div className="spinner" /><span>Carregando dados da planilha...</span></div>
    </div>
  );

  if (error && rows.length === 0) return (
    <div className="app">
      <div className="topbar"><div className="topbar-logo">Suno <span>Dashboard</span></div></div>
      <div className="loading" style={{ flexDirection:"column", gap:12 }}>
        <span style={{ color:"#ef4444" }}>&#9888; {error}</span>
        <button onClick={refresh} style={{ background:"#3b82f6", border:"none", color:"#fff", padding:"8px 16px", borderRadius:6, cursor:"pointer", fontSize:13 }}>Tentar novamente</button>
      </div>
    </div>
  );

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-logo">Suno <span>Revenue</span></div>
        <div className="topbar-sub">Dashboard Analítico</div>
        <div className="topbar-right">
          {loading && <div className="spinner" style={{ width:14, height:14 }} />}
          {lastUpdated && <span style={{ fontSize:11, color:"#8892a4" }}>Atualizado {lastUpdated.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })}</span>}
          <button onClick={refresh} style={{ background:"rgba(59,130,246,0.1)", border:"1px solid rgba(59,130,246,0.3)", color:"#93c5fd", padding:"3px 10px", borderRadius:6, fontSize:11, cursor:"pointer" }}>&#8635; Atualizar</button>
          <span className="badge-live">● {filtered.length.toLocaleString("pt-BR")} registros</span>
        </div>
      </div>

      <div className="layout">
        <aside className="sidebar">
          <div className="filter-section">
            <div className="filter-label">Granularidade</div>
            <select value={granularity} onChange={e => setGranularity(e.target.value)}>
              <option value="month">Mensal</option>
              <option value="year">Anual</option>
            </select>
          </div>

          <div className="filter-section">
            <div className="filter-label">Ano</div>
            <MultiCheck options={allAnos} selected={anos} onChange={setAnos} />
          </div>

          <div className="filter-section">
            <div className="filter-label">Canal / Grupo</div>
            <MultiCheck options={allChannels} selected={channels} onChange={setChannels} />
          </div>

          <div className="filter-section">
            <div className="filter-label">Classificação Comprador</div>
            <MultiCheck options={allClassif} selected={classifs} onChange={setClassifs} />
          </div>

          <div className="filter-section">
            <div className="filter-label">Tipo de Receita</div>
            <MultiCheck options={allTipoRec} selected={tiposRec} onChange={setTiposRec} />
          </div>

          <div className="filter-section">
            <div className="filter-label">Fonte do Pedido</div>
            <MultiCheck options={allFontes} selected={fontes} onChange={setFontes} />
          </div>

          <div className="filter-section">
            <div className="filter-label">UTM Source</div>
            <MultiCheck options={allSources} selected={sources} onChange={setSources} />
          </div>

          <div className="filter-section">
            <div className="filter-label">UTM Medium</div>
            <MultiCheck options={allMediums} selected={mediums} onChange={setMediums} />
          </div>

          <button className="btn-reset" onClick={resetFilters}>↺ Limpar filtros</button>
        </aside>

        <main className="main">
          {/* KPIs */}
          <div className="kpi-grid">
            <KpiCard label="Receita Total" value={fmt(totalReceita)} color="#3b82f6" sub={fmtFull(totalReceita)} />
            <KpiCard label="Aquisição" value={fmt(receitaAcq)} color="#10b981" sub={`${((receitaAcq/totalReceita)||0*100).toFixed(1)}% do total`} />
            <KpiCard label="Renovação" value={fmt(receitaRen)} color="#8b5cf6" sub={`${((receitaRen/totalReceita)||0*100).toFixed(1)}% do total`} />
            <KpiCard label="Ticket Médio" value={fmtFull(ticketMedio)} color="#f59e0b" sub={`${totalOrders.toLocaleString('pt-BR')} pedidos`} />
            <KpiCard label="Unidades" value={totalQtd.toLocaleString('pt-BR')} color="#ef4444" sub="assinaturas / produtos" />
          </div>

          {/* Tabs */}
          <div className="tab-bar">
            {[
              { id: 'overview', label: '📈 Evolução' },
              { id: 'canal', label: '📡 Canal & Classificação' },
              { id: 'oferta', label: '🎯 Ofertas' },
              { id: 'canal_digital', label: '🌐 Canal Digital' },
              { id: 'ticket', label: '💰 Ticket' },
            ].map(t => (
              <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab: Evolução */}
          {tab === 'overview' && (
            <>
              <div className="chart-card">
                <div className="chart-title">
                  Evolução da Receita
                  <span className="chart-subtitle">Aquisição vs Renovação</span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={timeSeriesData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <defs>
                      <linearGradient id="gradAcq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradRen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: '#8892a4', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#8892a4', fontSize: 11 }} tickFormatter={v => fmt(v)} width={70} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#8892a4' }} />
                    <Area type="monotone" dataKey="acq" name="Aquisição" stroke="#3b82f6" fill="url(#gradAcq)" strokeWidth={2} />
                    <Area type="monotone" dataKey="ren" name="Renovação" stroke="#10b981" fill="url(#gradRen)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="charts-grid">
                <div className="chart-card">
                  <div className="chart-title">Receita Total por Período</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={timeSeriesData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="label" tick={{ fill: '#8892a4', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#8892a4', fontSize: 10 }} tickFormatter={v => fmt(v)} width={60} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="receita" name="Receita" fill="#3b82f6" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <div className="chart-title">Ticket Médio por Período</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={timeSeriesData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="label" tick={{ fill: '#8892a4', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#8892a4', fontSize: 10 }} tickFormatter={v => `R$${v.toFixed(0)}`} width={60} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="ticket" name="Ticket Médio" fill="#f59e0b" radius={[3,3,0,0]} />
                      <Line type="monotone" dataKey="ticket" name="Ticket (linha)" stroke="#fcd34d" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-title">Pedidos e Unidades por Período</div>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={timeSeriesData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: '#8892a4', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#8892a4', fontSize: 11 }} width={50} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#8892a4' }} />
                    <Bar dataKey="orders" name="Pedidos" fill="#8b5cf6" radius={[3,3,0,0]} />
                    <Line type="monotone" dataKey="qtd" name="Unidades" stroke="#ec4899" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Tab: Canal & Classificação */}
          {tab === 'canal' && (
            <>
              <div className="charts-grid">
                <div className="chart-card">
                  <div className="chart-title">Receita por Canal de Aquisição</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={byChannel} dataKey="receita" nameKey="channel" cx="50%" cy="50%" outerRadius={90} label={({ name, pct }) => `${name} ${pct?.toFixed(0)}%`} labelLine={false}>
                        {byChannel.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <TopList data={byChannel} label="channel" />
                </div>

                <div className="chart-card">
                  <div className="chart-title">Aquisição vs Renovação</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={byClassif} dataKey="receita" nameKey="classif" cx="50%" cy="50%" outerRadius={90} label={({ name, pct }) => `${name} ${pct?.toFixed(0)}%`} labelLine={false}>
                        {byClassif.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {byClassif.map((d, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:12 }}>
                      <span style={{ color: d.fill, fontWeight:600 }}>{d.classif}</span>
                      <span>{fmt(d.receita)}</span>
                      <span style={{ color:'#8892a4' }}>{d.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="charts-grid">
                <div className="chart-card">
                  <div className="chart-title">Tipo de Receita</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byTipoRec} margin={{ top: 4, right: 4, bottom: 4, left: 4 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#8892a4', fontSize: 10 }} tickFormatter={v => fmt(v)} />
                      <YAxis type="category" dataKey="tipo" tick={{ fill: '#8892a4', fontSize: 11 }} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="receita" name="Receita" radius={[0,3,3,0]}>
                        {byTipoRec.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <div className="chart-title">Fonte do Pedido</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byFonte} margin={{ top: 4, right: 4, bottom: 4, left: 4 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#8892a4', fontSize: 10 }} tickFormatter={v => fmt(v)} />
                      <YAxis type="category" dataKey="fonte" tick={{ fill: '#8892a4', fontSize: 11 }} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="receita" name="Receita" radius={[0,3,3,0]}>
                        {byFonte.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Canal x Período */}
              <div className="chart-card">
                <div className="chart-title">Canal por Período (stacked)</div>
                <ChannelByPeriod rows={filtered} granularity={granularity} />
              </div>
            </>
          )}

          {/* Tab: Ofertas */}
          {tab === 'oferta' && (
            <>
              <div className="chart-card">
                <div className="chart-title">Top 15 Ofertas por Receita</div>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={byOffer.slice(0,15)} margin={{ top: 4, right: 8, bottom: 60, left: 8 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#8892a4', fontSize: 10 }} tickFormatter={v => fmt(v)} />
                    <YAxis type="category" dataKey="oferta" tick={{ fill: '#8892a4', fontSize: 10 }} width={220} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="receita" name="Receita" radius={[0,3,3,0]}>
                      {byOffer.slice(0,15).map((d, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <div className="chart-title">Tabela Completa de Ofertas</div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Oferta</th>
                        <th className="td-right">Receita</th>
                        <th className="td-right">Unidades</th>
                        <th className="td-right">Pedidos</th>
                        <th className="td-right">Ticket Médio</th>
                        <th className="td-right">% Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byOffer.map((d, i) => (
                        <tr key={i}>
                          <td style={{ color:'#8892a4' }}>{i+1}</td>
                          <td style={{ maxWidth: 280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={d.oferta}>{d.oferta}</td>
                          <td className="td-right td-num">{fmtFull(d.receita)}</td>
                          <td className="td-right td-num">{d.qtd.toLocaleString('pt-BR')}</td>
                          <td className="td-right td-num">{d.orders.toLocaleString('pt-BR')}</td>
                          <td className="td-right td-num">{fmtFull(d.ticket)}</td>
                          <td className="td-right td-num">{((d.receita/totalReceita)*100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Tab: Canal Digital */}
          {tab === 'canal_digital' && (
            <>
              <div className="charts-grid">
                <div className="chart-card">
                  <div className="chart-title">Top UTM Sources</div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={bySource.slice(0,12)} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#8892a4', fontSize: 10 }} tickFormatter={v => fmt(v)} />
                      <YAxis type="category" dataKey="source" tick={{ fill: '#8892a4', fontSize: 10 }} width={110} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="receita" name="Receita" radius={[0,3,3,0]}>
                        {bySource.slice(0,12).map((d, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <div className="chart-title">Top UTM Mediums</div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={byMedium.slice(0,12)} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#8892a4', fontSize: 10 }} tickFormatter={v => fmt(v)} />
                      <YAxis type="category" dataKey="medium" tick={{ fill: '#8892a4', fontSize: 10 }} width={110} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="receita" name="Receita" radius={[0,3,3,0]}>
                        {byMedium.slice(0,12).map((d, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-title">Top Campanhas (SNC / UTM)</div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Campanha</th>
                        <th className="td-right">Receita</th>
                        <th className="td-right">Pedidos</th>
                        <th className="td-right">% Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byCampaign.slice(0,30).map((d, i) => (
                        <tr key={i}>
                          <td style={{ color:'#8892a4' }}>{i+1}</td>
                          <td style={{ maxWidth:320, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={d.campanha}>{d.campanha}</td>
                          <td className="td-right td-num">{fmtFull(d.receita)}</td>
                          <td className="td-right td-num">{d.orders.toLocaleString('pt-BR')}</td>
                          <td className="td-right td-num">{((d.receita/totalReceita)*100).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Tab: Ticket */}
          {tab === 'ticket' && (
            <>
              <div className="charts-grid">
                <div className="chart-card">
                  <div className="chart-title">Distribuição por Faixa de Ticket</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={ticketDistrib} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="label" tick={{ fill: '#8892a4', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#8892a4', fontSize: 10 }} width={50} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="orders" name="Pedidos" fill="#3b82f6" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <div className="chart-title">Receita por Faixa de Ticket</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={ticketDistrib} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="label" tick={{ fill: '#8892a4', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#8892a4', fontSize: 10 }} tickFormatter={v => fmt(v)} width={70} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="receita" name="Receita" fill="#10b981" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-title">Ticket Médio por Canal</div>
                <TicketByDimension rows={filtered} />
              </div>

              <div className="chart-card">
                <div className="chart-title">Oferta × Ticket Médio (Top 20)</div>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={byOffer.slice(0,20)} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#8892a4', fontSize: 10 }} tickFormatter={v => `R$${v.toFixed(0)}`} />
                    <YAxis type="category" dataKey="oferta" tick={{ fill: '#8892a4', fontSize: 10 }} width={220} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="ticket" name="Ticket Médio" radius={[0,3,3,0]}>
                      {byOffer.slice(0,20).map((d, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function ChannelByPeriod({ rows, granularity }) {
  const channels = useMemo(() => [...new Set(rows.map(r => r.CHANNEL_GROUP || 'Vazio'))].sort(), [rows]);
  const data = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      const key = granularity === 'month'
        ? `${r.ANO}-${String(r.MES).padStart(2,'0')}`
        : String(r.ANO);
      const ch = r.CHANNEL_GROUP || 'Vazio';
      if (!map[key]) { map[key] = { period: key }; channels.forEach(c => { map[key][c] = 0; }); }
      map[key][ch] = (map[key][ch] || 0) + r.Receita;
    });
    return Object.values(map).sort((a, b) => a.period.localeCompare(b.period)).map(d => ({
      ...d,
      label: granularity === 'month'
        ? `${MES_LABEL[parseInt(d.period.split('-')[1])]}/${d.period.split('-')[0].slice(2)}`
        : d.period
    }));
  }, [rows, granularity, channels]);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="label" tick={{ fill: '#8892a4', fontSize: 10 }} />
        <YAxis tick={{ fill: '#8892a4', fontSize: 10 }} tickFormatter={v => fmt(v)} width={65} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#8892a4' }} />
        {channels.map((ch, i) => (
          <Bar key={ch} dataKey={ch} name={ch} stackId="a" fill={COLORS[i % COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function TicketByDimension({ rows }) {
  const data = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      const k = r.CHANNEL_GROUP || 'Vazio';
      if (!map[k]) map[k] = { channel: k, receita: 0, qtd: 0 };
      map[k].receita += r.Receita;
      map[k].qtd += r.Qtd;
    });
    return Object.values(map)
      .map(d => ({ ...d, ticket: d.qtd > 0 ? d.receita / d.qtd : 0 }))
      .sort((a, b) => b.ticket - a.ticket);
  }, [rows]);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="channel" tick={{ fill: '#8892a4', fontSize: 10 }} />
        <YAxis tick={{ fill: '#8892a4', fontSize: 10 }} tickFormatter={v => `R$${v.toFixed(0)}`} width={65} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="ticket" name="Ticket Médio" radius={[3,3,0,0]}>
          {data.map((d, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
